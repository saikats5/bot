const builder = require('botbuilder')
const restify = require('restify')

const connector = new builder.ChatConnector()
const bot = new builder.UniversalBot(connector, [
  (session) => {
    session.send('Hello World!')
  },
]).set('storage', new builder.MemoryBotStorage())

const server = restify.createServer()
server.post('/api/messages', connector.listen())
server.listen(3978)
