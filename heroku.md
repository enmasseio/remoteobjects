# Heroku

app: http://remoteobjects.herokuapp.com/

Deploy:

    git push heroku master

When deploying to heroku, the exprimental websocket support must be enabled

    heroku labs:enable websockets

https://devcenter.heroku.com/articles/node-websockets
