const SlackBot = require('slackbots');
const fetch = require('node-fetch')

if (!process.env.APIKEY) {
  console.error('Set APIKEY in .env')
}
if (!process.env.BONUSLY_TOKEN) {
  console.error('Set BONUSLY_TOKEN in .env')
}

// create a bot
const bot = new SlackBot({
    token: process.env.APIKEY, // Add a bot https://my.slack.com/services/new/bot and put the token 
    name: 'Gambly'
});

// found by listing users: bot.getUsers().then(arr => console.log(arr))
const BOT_ID = 'ULGU042K1'

let bonuslyUsers = {}

bot.on('start', () => {
  // fetch users and add to Map
  fetch(`https://bonus.ly/api/v1/users?access_token=${process.env.BONUSLY_TOKEN}`)
  //fetch('https://bonus.ly/api/v1/bonuses?access_token=ebd604cacd64f1296a27fa867a57ec3b')
  .then(res => res.json())
  .then(res => {
    // console.log(users)
    res.result.forEach(u => {
      bonuslyUsers[u.email] = u
      console.log(u.email)
    })
  })
  // .then(res => console.log(bonuslyUsers))
  .catch(err => console.log(err))
})

// on event firing (all events)
bot.on('message', (data) => {
  // ignore non-message events
  if (data.type !== 'message') {
    // console.log("Ignored non-message event");
    return;
  }
  // ignore it's own message responses
  if (data.subtype && data.subtype === 'bot_message') {
    // console.log("Ignored message by bot itself");
    return;
  }

  if (!data.user) {
    console.log(data);
    console.log('User info missing from message. Ignored message.');
    return;
  }
  if (!data.channel) {
    console.log(data);
    console.log('Channel info missing from message. Ignored message.');
    return;
  }
  console.log(data);

  // match user and channel objects & process message
  Promise.all([findUser(data.user), findChannel(data.channel)])
    .then(([userObj, channelObj]) => processMessage(userObj, channelObj, data));
})

const findUser = userID =>
  bot.getUsers()
  .then(obj => obj.members.filter(user => user.id === userID))
  .then(arr => arr[0]) // pick 1 (should only be one anyways)
  .catch(err => console.log(err));

const findChannel = channelID =>
  bot.getChannels()
  .then(obj => obj.channels.filter(channel => channel.id === channelID))
  .then(arr => arr[0]) // pick 1 (should only be one anyways)
  .catch(err => console.log(err));


const getEmailFromSlackUser = (userObj) => {
  if (!userObj) {
    console.log('Slack user is undefined.')
    return
  }
  if (!userObj.profile.email) {
    console.log('Slack user does not have an email.')
    return
  }
  return userObj.profile.email
}

// function: find bonusly user from email
const getBonuslyUserFromEmail = (userEmail) => {
  const bonuslyUser = bonuslyUsers[userEmail || '']
  if (!bonuslyUser) {
    console.log(`Cannot find bonusly user for "${userEmail}"`)
    return
  }
  return bonuslyUser
  // console.log(`Bonusly user id: ${bonuslyUser.id}`)
}

const processMessage = (userObj, channelObj, data) => {
    // more information about additional params https://api.slack.com/methods/chat.postMessage
    const params = {
        icon_emoji: ':money_with_wings:'
    };
    // bot.getUsers().then(arr => console.log(arr)).catch(err => console.log(err))
    

      /*
    Slack channel naming convention:
    C, it's a public channel
    D, it's a DM with the user
    G, it's either a private channel or multi-person DM
    // src: https://stackoverflow.com/questions/41111227/how-can-a-slack-bot-detect-a-direct-message-vs-a-message-in-a-channel
  */
  let messageloc;
  if (data.channel.startsWith('D')) {
    messageloc = 'direct-message';
  } else if (data.channel.startsWith('C')) {
    messageloc = 'public-channel';
  } else if (data.channel.startsWith('G')) {
    messageloc = 'private-channel';
  }

  if (messageloc === 'public-channel' && !channelObj) {
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
  if (messageloc !== 'direct-message' && !data.text.includes(`<@${BOT_ID}>`)) {
    console.log('Received message, not directed at bot.');
    return;
  }

    // remove mention text
    const msg = data.text.replace(/<@ULGU042K1>/g, '').trim();

    console.log(`FULL MSG: ${msg}`)
    if (!msg.indexOf('@') === -1) {
      console.log('Invalid message. Does not mention a user. ')
      bot.postMessageToUser(userObj.name, `Please mention a user in your message.`, params);
      return;
    }
    const start = msg.indexOf('@')
    const fragment = msg.slice(start)
    const userID = fragment.slice(1, fragment.indexOf('>')); // start at 1 to chop off "@"
    console.log(userID + "\n")
    
    // NOTE: bot.getUserById is broken lol
    bot.getUsers().then(e => {
      const users = e.members.filter( u => u.id == userID)
      if (!users[0]) {
        console.log(`User not found for user id ${userID}`)
      }
      const receiverObj = users[0]

      const email = getEmailFromSlackUser(receiverObj)
      console.log(email)
      const bonuslyUser = getBonuslyUserFromEmail(email)
      console.log(bonuslyUser.username)

      const giverEmail = getEmailFromSlackUser(userObj)


      const POST_URL = `https://bonus.ly/api/v1/bonuses`
      postData(POST_URL, {
        "giver_email": giverEmail,
        "reason": `+1 @${bonuslyUser.username} ${msg} #gambly`,
      })
      .then(res => console.log(res))
      .catch(err => console.log(err))
    })



    // thank user for feedback in the same channel it was submitted in
    if (userObj.name) {
      bot.postMessageToUser(userObj.name, `Thanks for your feedback, ${userObj.name}!`, params);
    }

    // define channel, where bot exist. You can adjust it there https://my.slack.com/services 
    bot.postMessageToChannel('general', 'read ur msg!', params);
    
    /*
    // define existing username instead of 'user_name'
    bot.postMessageToUser('user_name', 'meow!', params); 
    
    // If you add a 'slackbot' property, 
    // you will post to another user's slackbot channel instead of a direct message
    bot.postMessageToUser('user_name', 'meow!', { 'slackbot': true, icon_emoji: ':cat:' }); 
    
    // define private group instead of 'private_group', where bot exist
    bot.postMessageToGroup('private_group', 'meow!', params); 
    */
};

function postData(url = '', data = {}) {
  // Default options are marked with *
    return fetch(url, {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, cors, *same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
            'Content-Type': 'application/json',
            // 'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${process.env.BONUSLY_TOKEN}`
        },
        redirect: 'follow', // manual, *follow, error
        referrer: 'no-referrer', // no-referrer, *client
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    })
    .then(response => response.json()); // parses JSON response into native JavaScript objects 
}