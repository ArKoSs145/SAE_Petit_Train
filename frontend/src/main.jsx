import React from 'react'
import Accueil from './templates/Accueil.jsx'
import './styles.css'
import ReactDOM from "react-dom/client";
import Circuit from './templates/Circuit.jsx';
import Admin from './templates/Admin.jsx';
import Parametre from './templates/Parametre.jsx';
import Approvisionnement from './templates/Approvisionnement.jsx';

const root = ReactDOM.createRoot(document.getElementById("root"));

const renderApprovisionnement = () => {
    root.render(
      <React.StrictMode>
        <Approvisionnement onRetourAdmin={renderAdmin}/>
      </React.StrictMode>
    );
}

const renderCircuit = () => {
  root.render(
    <React.StrictMode>
      <Circuit onApp={renderAccueil}/>
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

const renderAccueil = () => {
    root.render(
      <React.StrictMode>
        <Accueil onContinue={renderCircuit} onAdminLogin={renderAdmin}/>
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
    <Accueil onContinue={renderCircuit} onAdminLogin={renderAdmin} />
  </React.StrictMode>
);
