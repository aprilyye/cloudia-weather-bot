Cloudia
---

Cloudia: A little reminder for weather it's gonna rain or shine! 🌦 On duty every morning at 7AM EST or via summon ```@cloudia``` in any channel (reports back in same channel).

Made with 🌤 by Kevin Lin and April Ye

![Cloudia](cloudia-logo.png)

Try it locally
---
Add an `.env` file with:
- `APIKEY` from Dark Sky API
- `SLACK_TOKEN` from the Slack API's OAuth Access Token 
- `BOT_TOKEN` from the Slack API's Bot User OAuth Access Token 

Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

In a terminal:
```bash
$ npm i
$ heroku local
```

References
---

- [mishk0/Slack-bot-api](https://github.com/mishk0/slack-bot-api)
- [Dark Sky API](https://darksky.net/dev/docs#overview)
- [Brella API](https://apps.apple.com/us/app/brella-personal-weather/id1163666072)
- [Gambly Slack Bot](https://github.com/anuragpapolu/gambly)

How to call Cloudia in Slack
---
In any channel, call:

```@cloudia```

Example response in that same channel:

```H2-Oh no! You might want to bring an umbrella. You should wear your shorts and t-shirt. The forecast is chance of light rain in the afternoon and partly cloudy in the evening, with a high of 82°F and low of 75°F.```

```Is there a lightning storm nearby? Because you look electrifying wearing your shorts and t-shirt. The forecast is cloudy throughout the day, with a high of 82°F and low of 74°F.```

