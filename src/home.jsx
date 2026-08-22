import React from "react";
import {Link} from "react-router";
function Home(){
    return(
        <div>
            <h1>React AI generator</h1>
            <Link to="/wireframe">Wireframe to React</Link>
            <br/>
            <Link to="/react-feature">React Feature</Link>
        </div>
    );
}
export default Home;