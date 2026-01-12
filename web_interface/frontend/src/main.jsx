/**
 * Point d'entrée principal de l'application React.
 * Gère le routage de l'application en définissant des fonctions 
 * de rendu pour basculer entre les différentes vues
 */
import React from 'react'
import App from './templates/App.jsx'
import './styles.css'
import ReactDOM from "react-dom/client";
import Base from './templates/Base.jsx';
import Admin from './templates/Admin.jsx';
import Parametre from './templates/Parametre.jsx';
import Approvisionnement from './templates/Approvisionnement.jsx';

// Initialisation du noeud racine React sur l'élément HTML avec l'ID "root"
const root = ReactDOM.createRoot(document.getElementById("root"));

const renderApprovisionnement = () => {
    root.render(
      <React.StrictMode>
        <Approvisionnement onRetourAdmin={renderAdmin}/>
      </React.StrictMode>
    );
}

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
        <Admin 
            onParametre={renderParametre} 
            onApprovisionnement={renderApprovisionnement} 
        />
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

// Rendu initial de l'application sur l'écran d'accueil
root.render(
  <React.StrictMode>
    <App onContinue={renderBase} onAdminLogin={renderAdmin} />
  </React.StrictMode>
);
