import { useEffect, useState } from "react";

function App() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8888/is_authenticated").then((res) => res.json()).then((data) => {
      setAuthenticated(data.authenticated);
    });
  }, []);

  if (authenticated == null) { return <></>}

  return authenticated ? <div>authenticated</div> : <a href="http://localhost:8888/login">Login in with Spotify</a>;
}

export default App;
