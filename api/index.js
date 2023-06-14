const express = require("express");
const cors = require("cors");
const request = require("request");
const querystring = require("querystring");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = "https://better-spotify-player-backend.vercel.app/callback";

function generateRandomString(length) {
  var text = "";
  var possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

var stateKey = "spotify_auth_state";

const app = express();

app.use(express.json())
app.use(cookieParser())

app.use(cors({credentials: true, origin: "https://better-spotify-player.vercel.app"}));

function refreshToken(req, res) {
  var authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " +
        new Buffer.from(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: req.cookies.refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      res.cookie("access_token") = body.access_token;
      res.cookie("last_refreshed") = Date.now();
      // may need new refresh token too
    }
  });
}

app.use((req, res, next) => {
  if (Object.keys(req.cookies).includes("last_refreshed")) {
    if (Date.now() - req.cookies["last_refreshed"] >= 3300000) { // 55 mins
      var authOptions = {
        url: "https://accounts.spotify.com/api/token",
        headers: {
          Authorization:
            "Basic " +
            new Buffer.from(client_id + ":" + client_secret).toString("base64"),
        },
        form: {
          grant_type: "refresh_token",
          refresh_token: req.cookies.refresh_token,
        },
        json: true,
      };
    
      request.post(authOptions, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          res.cookie("access_token",  body.access_token);
          res.cookie("last_refreshed", Date.now());
          // may need new refresh token too
        }
      });
    }
  }
  next()
})

app.get("/is-authenticated", (req, res) => {
  if (req.cookies) {
    res.json({"authenticated": req.cookies["access_token"] != null})
  } else {
    res.json({"authenticated": false})
  }
})

app.get("/login", function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  var scope = "user-read-private user-read-playback-state user-modify-playback-state user-read-currently-playing";

  res.redirect(
    "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      })
  );
});

app.get("/callback", function (req, res) {
  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(
      "better-spotify-player.vercel.app/#" +
        querystring.stringify({
          error: "state_mismatch",
        })
    );
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: "https://accounts.spotify.com/api/token",
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        Authorization:
          "Basic " +
          new Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
      json: true,
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {
        var access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: "https://api.spotify.com/v1/me",
          headers: { Authorization: "Bearer " + access_token },
          json: true,
        };

        // use the access token to access the Spotify Web API
        request.get(options);

        res.cookie("access_token", access_token)
        res.cookie("refresh_token", refresh_token)
        res.cookie("last_refreshed", Date.now())
        res.redirect("better-spotify-player.vercel.app/");
      } else {
        res.redirect(
          "better-spotify-player.vercel.app/#" +
            querystring.stringify({
              error: "invalid_token",
            })
        );
      }
    });
  }
});

app.get("/currently-playing", (req, res) => {
  request.get({url: "https://api.spotify.com/v1/me/player/currently-playing", headers: {Authorization: "Bearer " + req.cookies["access_token"]}}, (error, response, body) => {
    res.send(body);
  })
})

app.put("/seek", (req, res) => {
  request.put({url: `https://api.spotify.com/v1/me/player/seek?position_ms=${req.body.position_ms}`, headers: {Authorization: "Bearer " + req.cookies["access_token"]}});
  res.sendStatus(200)
})

app.get("/next", (req, res) => {
  request.post({url: "https://api.spotify.com/v1/me/player/next", headers: {Authorization: "Bearer " + req.cookies["access_token"]}})
  res.sendStatus(200)
})

app.get("/previous", (req, res) => {
  request.post({url: "https://api.spotify.com/v1/me/player/previous", headers: {Authorization: "Bearer " + req.cookies["access_token"]}})
  res.sendStatus(200)
})

app.put("/pause", (req, res) => {
  request.put({url: "https://api.spotify.com/v1/me/player/pause", headers: {Authorization: "Bearer " + req.cookies["access_token"]}});
  res.sendStatus(200);
})

app.put("/play", (req, res) => {
  request.put({url: `https://api.spotify.com/v1/me/player/play?position_ms=${req.body.position_ms}`, headers: {Authorization: "Bearer " + req.cookies["access_token"]}});
  res.sendStatus(200);
})

// app.get("/refresh_token", function (req, res) {
//   // requesting access token from refresh token
//   var refresh_token = req.query.refresh_token;
//   var authOptions = {
//     url: "https://accounts.spotify.com/api/token",
//     headers: {
//       Authorization:
//         "Basic " +
//         new Buffer.from(client_id + ":" + client_secret).toString("base64"),
//     },
//     form: {
//       grant_type: "refresh_token",
//       refresh_token: refresh_token,
//     },
//     json: true,
//   };

//   request.post(authOptions, function (error, response, body) {
//     if (!error && response.statusCode === 200) {
//       var access_token = body.access_token;
//       res.send({
//         access_token: access_token,
//       });
//     }
//   });
// });

app.listen(8888, () => {
  console.log(`Example app listening on port 8888`);
});

module.exports = app;