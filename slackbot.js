const SlackBot = require("slackbots");
const fetch = require("node-fetch");
const uuidv1 = require("uuid/v1");

if (!process.env.APIKEY) {
  console.error("Set APIKEY in .env");
}

// create a bot
const bot = new SlackBot({
  token: process.env.TOKEN, // Add a bot https://my.slack.com/services/new/bot and put the token
  name: "cloudia"
});

// found by listing users: bot.getUsers().then(arr => console.log(arr))
//bot.getUsers().then(arr => console.log(arr))
const BOT_ID = "UL6GS3G5Q";

// bot.on("start", () => {
//   // fetch users and add to Map
//   fetch(
//     `https://bonus.ly/api/v1/users?access_token=${
//       process.env.BONUSLY_TOKEN
//     }&show_financial_data=true`
//   )
//     //fetch('https://bonus.ly/api/v1/bonuses?access_token=ebd604cacd64f1296a27fa867a57ec3b')
//     .then(res => res.json())
//     .then(res => {
//       // console.log(users)
//       res.result.forEach(u => {
//         bonuslyUsers[u.email] = u;
//         console.log(u.email);
//       });
//     })
//     // .then(res => console.log(bonuslyUsers))
//     .catch(err => console.log(err));
// });

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

  const GET_URL = `https://bixby.brellaweatherapp.com/api/v1/assistant?key=${
    process.env.APIKEY
  }&lat=40.714272&long=-74.005966&units=us`;

  let weatherReport = "";

  fetch(GET_URL)
    .then(res => res.json())
    .then(res => {
      weatherReport = res.sentence;
      postToChannel(weatherReport);
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
        "random",
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
