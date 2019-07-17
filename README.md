Gambly
---

A slackbot that enables gambling with Bonusly :)

Try it locally
---
Add an `.env` file with `APIKEY` for the slackbot and a `BONUSLY_TOKEN` from the Bonusly API with admin priveleges.

Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)

In a terminal:
```bash
$ npm i
$ heroku local
```


Tech
---

- [mishk0/Slack-bot-api](https://github.com/mishk0/slack-bot-api)
- [Bonusly API](https://bonusly.docs.apiary.io/#)

> NOTE: need to restart app when adding new Slack users.


How to call Gambly in Slack
---
Example bet request:

```@gambly @johnny.appleseed +40 If you save plant 40 trees!```

Alternatively, one may write:

```@gambly +20 @champagne.papi If you drop an album by the end of this October```
