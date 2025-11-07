import React from 'react'
import App from './templates/App.jsx'
import './styles.css'
import ReactDOM from "react-dom/client";
import Base from './templates/Base.jsx';


const root = ReactDOM.createRoot(document.getElementById("root"));


const renderBase = () => {
  root.render(
    <React.StrictMode>
      <Base />
    </React.StrictMode>
  );
};


root.render(
  <React.StrictMode>
    <App onContinue={renderBase} />
  </React.StrictMode>
);