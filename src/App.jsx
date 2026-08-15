import React,{useState} from "react";
import ReactDom from "react-dom";
function inputpage(){
  const [userInfo,SetuserInfo]=useState({
    input1:"",
  });
  function handleClick(event){
    event.preventDefault();
    console.log(userInfo);
  }
  function handleChange(){
    const {name,value}=event.target;
    SetuserInfo(prevValue=>{
      return{
        ...prevValue,
        [name]:value
      }
    });
  }
  return(
    <form>
      <label>input1</label>
      <input type="text" value={userInfo.input1} name="input1" onChange={handleChange} placeholder="enter your input1"/>
      <button onClick={handleClick}>Submit</button>
    </form>
  )
}
export default inputpage;