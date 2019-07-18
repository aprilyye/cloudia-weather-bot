const SlackBot = require("slackbots");
const fetch = require("node-fetch");
const uuidv1 = require("uuid/v1");

const GET_URL = `https://bixby.brellaweatherapp.com/api/v1/assistant?key=${
  process.env.APIKEY
}&lat=40.714272&long=-74.005966&units=us`;

const POST_URL = `https://slack.com/api/chat.scheduleMessage`;

let weatherReport = "";

if (!process.env.APIKEY) {
  console.error("Set APIKEY in .env");
}

// create a bot
const bot = new SlackBot({
  token: process.env.BOT_TOKEN, // Add a bot https://my.slack.com/services/new/bot and put the token
  name: "cloudia"
});

// found by listing users: bot.getUsers().then(arr => console.log(arr))
//bot.getUsers().then(arr => console.log(arr))
const BOT_ID = "UL6GS3G5Q";

function postData(url = "", data = {}) {
  // Default options are marked with *
  return fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Bearer ${process.env.SLACK_TOKEN}`
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
    body: JSON.stringify(data) // body data type must match "Content-Type" header
  }).then(response => response.json()); // parses JSON response into native JavaScript objects
}

// reminderInterval of 24 hours = # of seconds in 24 hours
// https://stackoverflow.com/questions/2515047/how-do-i-add-24-hours-to-a-unix-timestamp-in-php
function postInMorning(weatherReport = "Good Morning!") {
  var postingDate = new Date(); //gets current date object
  let postingHourEST = 7;
  let postingMinuteEST = 0;
  if (postingDate.getHours() > 7) {
    // update posting hour to next day
    postingDate.setDate(postingDate.getDate() + 1);
  }
  // let utcESTHourDifferenceEST = 4; //to convert ETC to UTC, add 4 to EST
  postingDate.setHours(postingHourEST, postingMinuteEST);
  // console.log("posting time: ", postingDate.getTime() / 1000);
  // console.log("posting date: ", postingDate);
  postData(POST_URL, {
    channel: "nyc",
    text: weatherReport,
    post_at: postingDate.getTime() / 1000
  })
    .then(res => console.log(res))
    .catch(err => console.log(err));
}

bot.on("start", function() {
  fetch(GET_URL)
    .then(res => res.json())
    .then(res => {
      weatherReport = res.sentence;
      reminderIntervalMS = 24 * 60 * 60 * 1000;
      //reminderIntervalMS = 30000;
      postInMorning(weatherReport);
      setInterval(function() {
        postInMorning(weatherReport);
      }, reminderIntervalMS);
    })
    .catch(err => console.log(err));
});

// on event firing (all events)
bot.on("message", data => {
  // ignore non-message events
  if (data.type !== "message") {
    // console.log("Ignored non-message event");
    return;
  }
  // ignore it's own message responses
  if (data.subtype && data.subtype === "bot_message") {
    // console.log("Ignored message by bot itself");
    return;
  }

  if (!data.user) {
    console.log(data);
    console.log("User info missing from message. Ignored message.");
    return;
  }
  if (!data.channel) {
    console.log(data);
    console.log("Channel info missing from message. Ignored message.");
    return;
  }
  console.log(data);

  // match user and channel objects & process message
  Promise.all([findUser(data.user), findChannel(data.channel)]).then(
    ([userObj, channelObj]) => processMessage(userObj, channelObj, data)
  );
});

const findUser = userID =>
  bot
    .getUsers()
    .then(obj => obj.members.filter(user => user.id == userID))
    .then(arr => arr[0]) // pick 1 (should only be one anyways)
    .catch(err => console.log(err));

const findChannel = channelID =>
  bot
    .getChannels()
    .then(obj => obj.channels.filter(channel => channel.id == channelID))
    .then(arr => arr[0]) // pick 1 (should only be one anyways)
    .catch(err => console.log(err));

const processMessage = (userObj, channelObj, data) => {
  // more information about additional params https://api.slack.com/methods/chat.postMessage
  // bot.getUsers().then(arr => console.log(arr)).catch(err => console.log(err))

  /*
    Slack channel naming convention:
    C, it's a public channel
    D, it's a DM with the user
    G, it's either a private channel or multi-person DM
    // src: https://stackoverflow.com/questions/41111227/how-can-a-slack-bot-detect-a-direct-message-vs-a-message-in-a-channel
  */
  let messageloc;
  if (data.channel.startsWith("D")) {
    messageloc = "direct-message";
  } else if (data.channel.startsWith("C")) {
    messageloc = "public-channel";
  } else if (data.channel.startsWith("G")) {
    messageloc = "private-channel";
  }

  if (messageloc === "public-channel" && !channelObj) {
    // occurs in DM and private channels
    console.log(`Channel ${data.channel} can't be found in listed channels.`);
  }
  if (!userObj) {
    // very rare
    console.log(`User ${data.user} can't be found in listed users.`);
    return;
  }

  // require direct mention if not DMed
  // only handle valid messages directed at the bot
  if (messageloc !== "direct-message" && !data.text.includes(`<@${BOT_ID}>`)) {
    console.log("Received message, not directed at bot.");
    return;
  }

  // remove mention text
  let msg = data.text.replace(/<@UL6GS3G5Q>/g, "").trim();

  console.log(`FULL MSG: ${msg}`);
  if (!msg.indexOf("@") === -1) {
    console.log("Invalid message. Does not mention a user. ");
    bot.postMessageToUser(
      userObj.name,
      `Please mention a user in your message.`,
      {}
    );
    return;
  }

  // WEATHER CODE IS HERE

  fetch(GET_URL)
    .then(res => res.json())
    .then(res => {
      weatherReport = res.sentence;
      postToChannel(weatherReport);
      postInMorning(weatherReport);
    })
    .catch(err => console.log(err));

  // POSTING TO CHANNEL

  function postToChannel(weatherReport = "Cloudia is broken, sorry!") {
    bot
      .getChannels()
      .then(cs => cs.map(c => c.id))
      .then(console.log);
    findChannel(data.channel).then(channel => {
      bot.postMessageToChannel(
        channel.name,
        weatherReport,
        null,
        (payload, err) => {
          if (err) {
            console.log(err);
          } else {
            console.log("payload: " + JSON.stringify(payload));
          }
        }
      );
    });
  }
};
