import { useEffect, useState } from "react";

const api_url = "https://localhost:8888/"

function App() {
  const [authenticated, setAuthenticated] = useState(true);

  useEffect(() => {
    fetch(api_url + "is-authenticated").then((res) => res.json()).then((data) => {
      setAuthenticated(data.authenticated);
    });
  }, []);

  if (authenticated == null) { return <></>}

  return authenticated ? <Player/> : <a href={api_url + "login"}>Login in with Spotify</a>;
}

function Player() {
  const [currentSong, setCurrentSong] = useState({
    album: {images: [{url: "https://upload.wikimedia.org/wikipedia/en/b/bc/AlbumcoverDaveHolland-WhatGoesAround.jpg"}]},
    artists: [{name: "Dave Holland Big Band"}],
    name: "Shadow Dance"
  }) // TrackObject
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // milliseconds

  return <div>
    <div className="progress">

    </div>
    <div className="bottom-bar">
      <div className="relative">
        <div className="song-details">
          <img className="album-cover" src={currentSong.album.images[0].url}/>
        </div>
      </div>
    </div>
  </div>
}

export default App;
