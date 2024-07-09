const builder = require('botbuilder')
const restify = require('restify')
const githubClient = require('./github-client')

const connector = new builder.ChatConnector()
// session
// const bot = new builder.UniversalBot(connector, [
//   (session) => {
//     session.send('Hello World!')
//   },
// ]).set('storage', new builder.MemoryBotStorage())

//dialog based session
const bot = new builder.UniversalBot(connector).set(
  'storage',
  new builder.MemoryBotStorage()
)

const dialog = new builder.IntentDialog()
dialog.matches(/^search/i, [
  function (session, args, next) {
    if (session.message.text.toLowerCase() === 'search') {
      builder.Prompts.text(session, 'Who are you looking for?')
    } else {
      let query = session.message.text.substring(7)
      next({ response: query })
    }
  },
  function (session, result, next) {
    let query = result.response
    if (!query) {
      session.endDialog('Request cancelled')
    } else {
      githubClient.executeSearch(query, function (profiles) {
        let totalCount = profiles.total_count
        if (totalCount === 0) {
          session.endDialog('Sorry, no results found.')
        } else if (totalCount > 10) {
          session.endDialog(
            'More than 10 results were found. Please provide a more restrictive query.'
          )
        } else {
          session.dialogData.property = null
          let usernames = profiles.items.map(function (item) {
            return item.login
          })
          builder.Prompts.choice(
            session,
            'What user do you want to load?',
            usernames
          )
        }
      })
    }
  },
  function (session, result, next) {
    let username = result.response.entity
    githubClient.loadProfile(username, function (profile) {
      let card = new builder.ThumbnailCard(session)
      card.title(profile.login)
      card.images([builder.CardImage.create(session, profile.avatar_url)])
      if (profile.name) {
        card.subtitle(profile.name)
      }
      let text = ''
      if (profile.company) {
        text += profile.company + ' \n'
      }
      if (profile.email) {
        text += profile.email + ' \n'
      }
      if (profile.bio) {
        text += profile.bio
      }
      card.text(text)

      card.tap(new builder.CardAction.openUrl(session, profile.html_url))
      let message = new builder.Message(session).attachments([card])
      session.send(message)
    })
  },
])
bot.dialog('/', dialog)

const server = restify.createServer()
server.post('/api/messages', connector.listen())
server.listen(3978)
