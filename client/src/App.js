import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [userNameReg, setUserNameReg] = useState("");
  const [passwordReg, setPasswordReg] = useState("");
  const [emailReg, setEmailReg] = useState("");
  const [companyReg, setCompanyReg] = useState("");
  const [regErrStatus, setRegErrStatus] = useState(false);
  const [regErrorMsg, setRegErrorMsg] = useState({
    userName: "",
    email: "",
    company: "",
    password: "",
  });

  const [userNameLogin, setUserNameLogin] = useState("");
  const [passwordLogin, setPasswordLogin] = useState("");
  const [loggedInInfo, setLoggedInInfo] = useState({
    userName: "",
    email: "",
    company: "",
  });
  const [usersList, setUsersList] = useState([]);
  const [loginStatus, setLoginStatus] = useState(false);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      const res = await fetch("http://localhost:5000/login", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      try {
        const data = await res.json();
        console.log(res);
        console.log(data);

        if (data.isLoggedIn === true) {
          setLoginStatus(data.isLoggedIn);
          setLoggedInInfo({
            userName: data.user.userName,
            email: data.user.email,
            company: data.user.company,
          });
        } else {
          setLoginStatus(data.isLoggedIn);
        }
      } catch (err) {
        console.log(err);
      }
    }
    checkLogin();
  }, [loginStatus]);

  const onRegister = async (e) => {
    e.preventDefault();
    const req = {
      userName: userNameReg,
      email: emailReg,
      company: companyReg,
      password: passwordReg,
    };
    const res = await fetch("http://localhost:5000/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    console.log("res: ", res);
    const data = await res.json();
    if (res.ok) {
      setRegErrStatus(false);
      alert(data.message);
      console.log(data);
    } else {
      if (res.status === 400) {
        console.log("data: ", data);
        setRegErrStatus(true);
        setRegErrorMsg({
          userName: data.nameErr ? data.nameErr.msg : "",
          email: data.emailErr ? data.emailErr.msg : "",
          company: data.compErr ? data.compErr.msg : "",
          password: data.pwErr ? data.pwErr.msg : "",
        });
        console.log(regErrorMsg);
      } else {
        //500
        alert(data.message);
      }
    }
  };
  const onLogin = async (e) => {
    e.preventDefault();
    const req = { userName: userNameLogin, password: passwordLogin };
    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(req),
    });
    const data = await res.json();
    if (res.ok) {
      setLoginStatus(true);
      console.log("login: ", data);
      setLoggedInInfo({
        userName: data.USERNAME,
        email: data.EMAIL,
        company: data.COMPANY,
      });
    } else {
      setLoginStatus(false);
      console.log(data);
      alert(data.message);
    }
  };
  const onLogout = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    console.log(data);
    setLoginStatus(false);
  };

  const onGetAllUsers = async (e) => {
    e.preventDefault();
    const res = await fetch("http://localhost:5000/users", {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok) {
      console.log("userList: ", data);
      setUsersList(data);
      setShowUsers(true);
    } else {
      setLoginStatus(false);
      setShowUsers(false);
      //console.log("1111", data);
      alert(data.error);
    }
  };

  return (
    <div className="App">
      <h1>Login Basics</h1>
      <form
        onSubmit={(e) => {
          onRegister(e);
        }}
      >
        <h1>Registeration</h1>
        <div className="form__group">
          <label htmlFor="userName">User Name: </label>
          <input
            type="text"
            onChange={(e) => {
              setUserNameReg(e.target.value);
            }}
          />
          {regErrStatus ? regErrorMsg.userName : ""}
        </div>
        <div className="form__group">
          <label htmlFor="Email">Email : </label>
          <input
            type="email"
            onChange={(e) => {
              setEmailReg(e.target.value);
            }}
          />
          {regErrStatus ? regErrorMsg.email : ""}
        </div>
        <div className="form__group">
          <label htmlFor="Company">Company : </label>
          <input
            type="text"
            onChange={(e) => {
              setCompanyReg(e.target.value);
            }}
          />
          {regErrStatus ? regErrorMsg.company : ""}
        </div>
        <div className="form__group">
          <label htmlFor="password">password: </label>
          <input
            type="password"
            onChange={(e) => {
              setPasswordReg(e.target.value);
            }}
          />
          {regErrStatus ? regErrorMsg.password : ""}
        </div>
        <button type="submit">Register</button>
      </form>
      <form onSubmit={onLogin}>
        <h1>Login</h1>
        <div className="form__group">
          <label htmlFor="userName">User Name: </label>
          <input
            type="text"
            onChange={(e) => {
              setUserNameLogin(e.target.value);
            }}
          />
        </div>

        <div className="form__group">
          <label htmlFor="password">password: </label>
          <input
            type="password"
            onChange={(e) => {
              setPasswordLogin(e.target.value);
            }}
          />
        </div>
        <button type="submit">Login</button>
      </form>
      {loginStatus ? (
        <div>
          <h1>Login Successful</h1>
          <h2>Welcome! {loggedInInfo.userName}</h2>
          <h3>📧 {loggedInInfo.email}</h3>
          <h3>🏢 {loggedInInfo.company}</h3>

          <button onClick={onGetAllUsers}>GetAllUser</button>
          <button onClick={onLogout}>Logout</button>
          {showUsers ? (
            <div>
              <ul>
                {usersList.map((user) => (
                  <li key={user.USERNAME}>
                    <h4>🙍‍♂️: {user.USERNAME}</h4>
                    <h4>📧: {user.EMAIL}</h4>
                    <h4>🏢: {user.COMPANY}</h4>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <h1>Not LoggedIn Yet</h1>
      )}
    </div>
  );
}

export default App;
