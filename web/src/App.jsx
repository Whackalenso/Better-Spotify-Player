import { useEffect, useState, useRef } from "react";
import {
  PlayCircleFill,
  PauseCircleFill,
  ArrowClockwise,
  ArrowCounterclockwise,
  SkipStartFill,
  SkipEndFill,
} from "react-bootstrap-icons";

const api_url = "https://better-spotify-player-api.onrender.com/";

function App() {
  const [authenticated, setAuthenticated] = useState();

  useEffect(() => {
    fetch(api_url + "/is-authenticated")
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data.authenticated);
      });
  }, []);

  if (authenticated == null) {
    return <></>;
  }

  return authenticated ? (
    <Player />
  ) : (
    <a href={api_url + "login"}>Login in with Spotify</a>
  );
}

const msToTime = (ms) => {
  var seconds = Math.floor(ms / 1000);
  var minutes = Math.floor(seconds / 60);
  var seconds = seconds % 60;
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return `${minutes}:${seconds}`;
};

const SkipBtn = (props) => (
  <div className="skip-btn" onClick={props.onClick}>
    <props.icon className="skip-arrow" size={40} />
    <p className="skip-btn-num">{props.skipTime}</p>
  </div>
);

function Player() {
  const [currentSong, _setCurrentSong] = useState(null);
  const currentSongRef = useRef(null);
  const setCurrentSong = (value) => {
    _setCurrentSong(value);
    currentSongRef.current = value;
  };

  const [playing, _setPlaying] = useState(false);
  const playingRef = useRef(playing);
  const setPlaying = (value) => {
    _setPlaying(value);
    playingRef.current = value;
  };

  const [progress, _setProgress] = useState(null); // percent
  const progressRef = useRef(null);
  const setProgress = (value) => {
    _setProgress(value);
    progressRef.current = value;
  };
  // const songPos = useRef(progress);

  const [prevPos, setPrevPos] = useState(null);
  const prevPosRef = useRef();
  prevPosRef.current = prevPos;

  const [mousePos, setMousePos] = useState(0);
  const animateProgressMove = useRef(true);

  const checkForUpdates = useRef(true);
  const checkForUpdatesTimeout = useRef(); // timer to turn back on checking after progress is submitted

  const [skipTimeInput, setSkipTimeInput] = useState(
    localStorage.getItem("skipTime") ? localStorage.getItem("skipTime") : 5
  );
  const [skipTime, setSkipTime] = useState(skipTimeInput);
  const skipTimeRef = useRef();
  skipTimeRef.current = skipTime;

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);

    const progressInterval = setInterval(() => {
      if (playingRef.current) {
        addMs(100);
        if (progressRef.current >= 1) {
          playingRef.current = false;
        }
      }
    }, 100);

    refresh();

    const fetchInterval = setInterval(() => {
      if (checkForUpdates.current) {
        refresh();
      }
    }, 1000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(progressInterval);
      clearInterval(fetchInterval);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("skipTime", skipTime);
  }, [skipTime]);

  function refresh() {
    fetch(api_url + "currently-playing", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (checkForUpdates.current) {
          // in case it changed in this time
          console.log("Refreshed");
          setProgress(data.progress_ms / data.item.duration_ms);
          setCurrentSong(data);
          setPlaying(data.is_playing);
        }
      });
  }

  function stopRefresh() {
    checkForUpdates.current = false;
    if (checkForUpdatesTimeout.current) {
      clearTimeout(checkForUpdatesTimeout.current);
    }
  }

  function handleKeyDown(e) {
    if (e.key == "Escape") {
      if (prevPosRef.current != null) {
        animateProgressMove.current = true;

        stopRefresh();

        setProgress(prevPosRef.current);
        setPrevPos(null);
        submitProgress();
      }
    }

    if (e.key == " ") {
      togglePlaying();
    }

    if (e.key == "ArrowLeft") {
      skipL();
    }
    if (e.key == "ArrowRight") {
      skipR();
    }
  }

  function togglePlaying() {
    stopRefresh();
    if (playingRef.current) {
      callApi("pause", "PUT");
    } else {
      callApi("play", "PUT", {
        position_ms:
          progressRef.current * currentSongRef.current.item.duration_ms,
      });
    }
    setPlaying(!playingRef.current);
  }

  function skipR() {
    stopRefresh();
    addMs(1000 * skipTime);
    submitProgress();
  }

  function skipL() {
    stopRefresh();
    addMs(-1000 * skipTime);
    submitProgress();
  }

  function callApi(endpoint, method, body = null) {
    fetch(api_url + endpoint, {
      method: method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : null,
    }).then(() => {
      checkForUpdatesTimeout.current = setTimeout(() => {
        checkForUpdates.current = true;
      }, 2000);
    });
  }

  function submitProgress() {
    callApi("seek", "PUT", {
      position_ms: Math.floor(
        progressRef.current * currentSongRef.current.item.duration_ms
      ),
    });
  }

  function submitSkipTime() {
    if (skipTimeInput > 0) {
      setSkipTime(skipTimeInput);
    } else {
      setSkipTimeInput(skipTime);
    }
  }

  function addMs(ms) {
    const progress_ms =
      currentSongRef.current.item.duration_ms * progressRef.current;
    setProgress((progress_ms + ms) / currentSongRef.current.item.duration_ms);
  }

  function mouseUpdate(e, click = false) {
    var pos =
      Math.min(Math.max(e.clientX, 0), window.innerWidth) / window.innerWidth;
    setMousePos(pos);

    if (e.buttons == 1) {
      animateProgressMove.current = click;
      setProgress(pos);
    }
  }

  const timestampPos = (percent, pr = 50) => {
    const px = percent * window.innerWidth;
    if (px <= 60) {
      return 10;
    }
    if (px >= window.innerWidth - pr) {
      return window.innerWidth - pr - 50;
    }
    return `calc(${percent * 100}% - 50px)`;
  };

  const mouseTimestampStack = () => {
    var mousePx = mousePos * window.innerWidth;
    var progressPx = progress * window.innerWidth;
    if (progressPx < 50) {
      progressPx = 50;
    }
    if (mousePx < 60) {
      mousePx = 60;
    }
    if (progressPx > window.innerWidth - 50) {
      progressPx -= 50;
    }
    if (mousePx >= progressPx - 40 && mousePx < progressPx + 40) {
      return true;
    }
    if (mousePx > window.innerWidth - 40) {
      return true;
    }
    return false;
  };

  if (currentSong == null) {
    return <div>Nothing is playing</div>;
  }

  return (
    <div className="player">
      <div
        className="progress-zone"
        onMouseMove={mouseUpdate}
        onMouseDown={(e) => {
          e.preventDefault();

          playingRef.current = false;

          checkForUpdates.current = false;
          if (checkForUpdatesTimeout.current) {
            clearTimeout(checkForUpdatesTimeout.current);
          }

          mouseUpdate(e, true);
          if (mousePos != progress) {
            // to check if you're setting the progress to where it already is
            setPrevPos(progress);
          } else {
            setPrevPos(null);
          }
        }}
        onMouseUp={(e) => {
          if (e.button == 0) {
            animateProgressMove.current = true;
            playingRef.current = playing;
            submitProgress();
          }
        }}
        onMouseLeave={mouseUpdate}
      >
        <div
          className="timestamp"
          style={{
            left: timestampPos(progress),
            transitionDuration: animateProgressMove.current ? "100ms" : "0ms",
          }}
        >
          {msToTime(progress * currentSong.item.duration_ms)}
        </div>
        <div className="timestamp" style={{ right: 10 }}>
          {msToTime(currentSong.item.duration_ms)}
        </div>
        <div
          className="timestamp mouse-timestamp"
          style={{
            left: timestampPos(mousePos, 0),
            top: mouseTimestampStack() ? 40 : 10,
            opacity:
              msToTime(progress * currentSong.item.duration_ms) ===
              msToTime(mousePos * currentSong.item.duration_ms)
                ? 0
                : 1,
          }}
        >
          {msToTime(mousePos * currentSong.item.duration_ms)}
        </div>
        <div
          className="scrubber"
          style={{
            left: `${mousePos * 100}%`,
          }}
        ></div>
        {prevPos ? (
          <div
            className="scrubber"
            style={{ height: "5%", left: `${prevPos * 100}%` }}
          >
            <div className="prev-pos-text">Press esc to revert</div>
          </div>
        ) : null}
        <div
          className="progress"
          style={{
            width: `${progress * 100}%`,
            transitionDuration: animateProgressMove.current ? "100ms" : "0ms",
          }}
        ></div>
      </div>
      <div className="bottom-bar">
        <div className="bottom-bar-content">
          <div className="song-details-wrapper">
            <img
              className="album-cover"
              src={currentSong.item.album.images[0].url}
            />
            <div className="song-details">
              <div className="song-name">{currentSong.item.name}</div>
              <div className="song-artist">
                {currentSong.item.artists
                  .map((artist) => artist.name)
                  .join(", ")}
              </div>
            </div>
          </div>
          <div className="controls">
            <SkipStartFill
              className="control-btn"
              size={40}
              onClick={() => {
                fetch(api_url + "previous", { credentials: "include" });
              }}
            />
            <SkipBtn
              icon={ArrowCounterclockwise}
              onClick={skipL}
              skipTime={skipTime}
            />
            <div onClick={togglePlaying}>
              {playing ? (
                <PauseCircleFill className="control-btn" size={40} />
              ) : (
                <PlayCircleFill className="control-btn" size={40} />
              )}
            </div>
            <SkipBtn
              icon={ArrowClockwise}
              onClick={skipR}
              skipTime={skipTime}
            />
            <SkipEndFill
              className="control-btn"
              size={40}
              onClick={() => {
                fetch(api_url + "next", { credentials: "include" });
              }}
            />
          </div>
          <div className="options">
            <div className="options-item">
              Skip amount (s)
              <input
                type="number"
                min={1}
                value={skipTimeInput}
                onChange={(e) => {
                  if (e.target.value < 1000) {
                    setSkipTimeInput(e.target.value);
                  }
                }}
                onBlur={submitSkipTime}
                onKeyUp={(e) => {
                  if (e.key == "Enter") {
                    submitSkipTime();
                    e.target.blur();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
