import { useEffect, useState } from "react";
import { PlayCircleFill, PauseCircleFill, ArrowClockwise, ArrowCounterclockwise, SkipStartFill, SkipEndFill } from "react-bootstrap-icons";

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
      <div className="bottom-bar-content">
        <div className="song-details-wrapper">
          <img className="album-cover" src={currentSong.album.images[0].url}/>
          <div className="song-details">
            <div className="song-name">{currentSong.name}</div>
            <div className="song-artist">{currentSong.artists[0].name}</div>
          </div>
        </div>
        <div className="controls">
          <SkipStartFill color="white" size={40}/>
          <ArrowCounterclockwise color="white" size={40}/>
          <PlayCircleFill color="white" size={40}/>
          <ArrowClockwise color="white" size={40}/>
          <SkipEndFill color="white" size={40}/>
        </div>
        <div className="options">
          adfafd
        </div>
      </div>
    </div>
  </div>
}

export default App;
