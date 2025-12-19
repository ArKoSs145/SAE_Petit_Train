import React from 'react'
import App from './templates/App.jsx'
import './styles.css'
import ReactDOM from "react-dom/client";
import Base from './templates/Base.jsx';
import Admin from './templates/Admin.jsx';
import Parametre from './templates/Parametre.jsx';


const root = ReactDOM.createRoot(document.getElementById("root"));


const renderBase = () => {
  root.render(
    <React.StrictMode>
      <Base onApp={renderApp}/>
    </React.StrictMode>
  );
};

const renderAdmin = () => {
    root.render(
      <React.StrictMode>
        <Admin onParametre={renderParametre}/>
      </React.StrictMode>
    );
};

const renderApp = () => {
    root.render(
      <React.StrictMode>
        <App onContinue={renderBase} onAdminLogin={renderAdmin}/>
      </React.StrictMode>
    );
};

const renderParametre = () => {
    root.render(
      <React.StrictMode>
        <Parametre onRetourAdmin={renderAdmin}/>
      </React.StrictMode>
    );
}

root.render(
  <React.StrictMode>
    <App onContinue={renderBase} onAdminLogin={renderAdmin} />
  </React.StrictMode>
);
