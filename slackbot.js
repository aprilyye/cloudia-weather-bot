const SlackBot = require('slackbots');
const fetch = require('node-fetch')
const uuidv1 = require('uuid/v1');

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
  fetch(`https://bonus.ly/api/v1/users?access_token=${process.env.BONUSLY_TOKEN}&show_financial_data=true`)
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
    let msg = data.text.replace(/<@ULGU042K1>/g, '').trim();

    console.log(`FULL MSG: ${msg}`)
    if (!msg.indexOf('@') === -1) {
      console.log('Invalid message. Does not mention a user. ')
      bot.postMessageToUser(userObj.name, `Please mention a user in your message.`, {});
      return;
    }
    const start = msg.indexOf('@')
    const fragment = msg.slice(start)
    //userID is the RECIPIENT userID
    const userID = fragment.slice(1, fragment.indexOf('>')); // start at 1 to chop off "@"
    console.log("recipientID: " + userID + "\n")
    
    if (!msg.indexOf('+') === -1) {
      console.log('Invalid message. Does not mention an amount of Bonusly to give. ')
      bot.postMessageToUser(userObj.name, `Please mention an amount of Bonusly to give.`, {});
      return;
    }
    console.log("# of +'s: " + (msg.split("+").length-1) )
    if (msg.split("+").length > 2) {
      console.log('Should only have one + sign in the message')
      bot.postMessageToUser(userObj.name, 'Please put only one + sign in your message to specify the amount.', {});
      return;
    }
    console.log("findAmount(msg): " + findAmount(msg));
    // const amtStart = msg.indexOf('+')
    // const amtFragment = msg.slice(amtStart)
    // const amount = amtFragment.slice(1, amtFragment.indexOf('>'));
    const amount = findAmount(msg)
    if (!amount) {
      console.log("Invalid amount specified")
      bot.postMessageToUser(userObj.name, "Invalid amount specified, please provide a valid amount.")
      return
    }
    console.log("amount: " + amount + "\n")

    msg = msg.replace("+"+amount, "")

    console.log("msg after amount removed: " + msg)
    console.log("reason: " + findReason(msg))

    finalMsg = findReason(msg)

    const bonuslyReq = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `You have a new Gambly bet request from ${getBonuslyUserFromEmail(getEmailFromSlackUser(userObj)).full_name}! Would you like to approve it?`
        }
      },
      {
        "type": "section",
        "fields": [
        
          {
            "type": "mrkdwn",
            "text": `*Bonusly Amount:*\n${amount}`
          },
          {
            "type": "mrkdwn",
            "text": `*Reason:*\n${finalMsg}`
          }
        ]
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "Yes"
            },
            "style": "primary",
            "value": "true"
          },
          {
            "type": "button",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "No"
            },
            "style": "danger",
            "value": "false"
          }
        ]
      }
    ]
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
      console.log("Bonusly recipient full name: " + bonuslyUser.full_name)

      const params = {
        blocks: bonuslyReq
      };
      console.log("userObj name: " + userObj.name)
      console.log("recipient userID: " + userID)
      console.log("recipient name: " + receiverObj.name)
      // const recipientName = findUser(userID).name
      if (receiverObj.name) {
        const recipientName = receiverObj.name
        // msgString = `You're about to receive a Bonusly bet request from ${userObj.name}!`
        bot.postMessageToUser(recipientName, "", params, (payload, err) => {
          if (err) {
            console.log(err)
          } else {
            console.log("payload: " + JSON.stringify(payload))
          }
        }).then(payload => {
          console.log(payload)
        }).catch(err => console.log(err))
      }
      const giverEmail = getEmailFromSlackUser(userObj)

//       const POST_URL = `https://bonus.ly/api/v1/bonuses`
//       postData(POST_URL, {
//         "giver_email": giverEmail,
//         "reason": `+${amount} @${bonuslyUser.username} ${msg} #gambly`,
//       })
//       .then(res => console.log(res))
//       .catch(err => console.log(err))
//       const userEmail = getEmailFromSlackUser(userObj)
      const userBalance = getBonuslyUserFromEmail(userEmail)['giving_balance']
      const receiverEmail = getEmailFromSlackUser(receiverObj)
      const receiverBalance = getBonuslyUserFromEmail(receiverEmail)['giving_balance']
      
      if (userBalance < parseInt(amount)) {
        bot.postMessageToChannel ('general', `${userObj.name} has insufficient balance`);
        return;
      } else if (receiverBalance < parseInt(amount)) {
        bot.postMessageToChannel ('general', `${receiverObj.name} has insufficient balance`);
        return;
      }

      const POST_URL = `https://bonus.ly/api/v1/bonuses`
      const approved = true;
      
      if (approved) {
        const users = [userObj, receiverObj]

        console.log("Starting atlas query...")

        atlasWinner(users).then((winner) => {
        let loser = (winner.id == userObj.id ? receiverObj : userObj)
        
          let giverEmail = getEmailFromSlackUser(winner)
          let email = getEmailFromSlackUser(loser)
          let bonuslyUser = getBonuslyUserFromEmail(email)

          postData(POST_URL, {
            "giver_email": giverEmail,
            "reason": `+${amount} @${bonuslyUser.username} ${msg} #gambly`,
          })
          .then(res => console.log(res))
          .catch(err => console.log(err))
          bot.postMessageToChannel ('general', `${bonuslyUser.username} has won the wager!`);
        })
        .catch(err => console.log(err))
      }
    })
};

// take in 2 user objects and returns the winning object
async function atlasWinner(users) {
  let winner = users[Math.floor(Math.random() * users.length)];

  const MongoClient = require('mongodb').MongoClient;
  const uri = process.env.MONGO_URI;
  console.log("Connecting to Atlas")
  const db = await MongoClient.connect(uri, { useNewUrlParser: true });
  console.log("Connected to Atlas")

  const bets = db.db("gambly").collection("bets");
  
  const betId = uuidv1();
  await bets.insertOne(
      { betId: betId, winner: users[0] }
  );
  await bets.insertOne(
      { betId: betId, winner: users[1] }
  );

  const winnersList = await bets.aggregate([ 
    { $match: { betId: betId } },
    { $sample: { size: 1 } } 
  ]).toArray();

  await bets.deleteMany({ betId: betId })
  await db.close()

  // check for empty lists 
  if (winnersList.length > 0) {
    winner = winnersList[0].winner
  }

  return new Promise((resolve, reject) => {
    try {
      resolve(winner);
    } catch (error) {
      reject(error);
    }
  });

}

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

function findAmount(msg = '') {
  if (msg == '') {
    console.error("Message cannot be empty if trying to find amount");
  }
  const regex = /\+(\d+)/gm;
  let m;

  while ((m = regex.exec(msg)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
        regex.lastIndex++;
    }
    
    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
        console.log(`Found match, group ${groupIndex}: ${match}`);
    });
    return m[1]
  }
}

function findReason(msg = '') {
  if (msg == '') {
    console.error("Message cannot be empty if trying to find amount");
  }

  const regex = /<[^>]*>/gm;
  let m;

  while ((m = regex.exec(msg)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
          regex.lastIndex++;
      }
      
      // The result can be accessed through the `m`-variable.
      m.forEach((match, groupIndex) => {
          console.log(`Found match, group ${groupIndex}: ${match}`);
      });
      console.log("m[0]: " + m[0])
      msg = msg.replace(m[0], "").trim()
      return msg
  }
}