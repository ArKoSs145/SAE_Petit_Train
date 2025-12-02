import React from 'react'
import App from './templates/App.jsx'
import './styles.css'
import ReactDOM from "react-dom/client";
import Base from './templates/Base.jsx';
import Admin from './templates/Admin.jsx';


const root = ReactDOM.createRoot(document.getElementById("root"));


const renderBase = () => {
  root.render(
    <React.StrictMode>
      <Base />
    </React.StrictMode>
  );
};

const renderAdmin = () => {
    root.render(
      <React.StrictMode>
        <Admin />
      </React.StrictMode>
    );
};


root.render(
  <React.StrictMode>
    <App onContinue={renderBase} onAdminLogin={renderAdmin}/>
  </React.StrictMode>
);
