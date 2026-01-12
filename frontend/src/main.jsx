import React from 'react'
import ReactDOM from "react-dom/client";
import './styles.css'

// Imports mis à jour avec les nouveaux noms de fichiers
import Accueil from './templates/Accueil.jsx'
import Circuit from './templates/Circuit.jsx';
import Admin from './templates/Admin.jsx';
import Parametre from './templates/Parametre.jsx';
import Approvisionnement from './templates/Approvisionnement.jsx';
import ChoixDepart from './templates/ChoixDepart.jsx';
import ConfigDepartPerso from './templates/ConfigDepartPerso';

const root = ReactDOM.createRoot(document.getElementById("root"));

// --- FONCTIONS DE RENDU ---

const renderAccueil = () => {
  root.render(
    <React.StrictMode>
      <Accueil 
        onContinue={() => renderCircuit("Normal")} 
        onAdminLogin={renderAdmin} 
        onCustomStart={renderChoixDepart}
      />
    </React.StrictMode>
  );
};

const renderCircuit = (mode = "Normal") => {
  root.render(
    <React.StrictMode>
      <Circuit mode={mode} onApp={renderAccueil}/>
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

const renderApprovisionnement = () => {
  root.render(
    <React.StrictMode>
      <Approvisionnement onRetourAdmin={renderAdmin}/>
    </React.StrictMode>
  );
}

const renderParametre = () => {
  root.render(
    <React.StrictMode>
      <Parametre onRetourAdmin={renderAdmin}/>
    </React.StrictMode>
  );
}

const renderChoixDepart = () => {
  root.render(
    <React.StrictMode>
      <ChoixDepart 
        onRetour={renderAccueil} 
        onConfigurer={renderConfigPerso}
        onLancer={() => renderCircuit("Personnalisé")} 
      />
    </React.StrictMode>
  );
};

const renderConfigPerso = () => {
  root.render(
    <React.StrictMode>
      <ConfigDepartPerso 
        onRetour={renderChoixDepart} 
        onLancer={() => renderCircuit("Personnalisé")} 
      />
    </React.StrictMode>
  );
}

// --- RENDU INITIAL ---
root.render(
  <React.StrictMode>
    <Accueil 
      onContinue={() => renderCircuit("Normal")} 
      onAdminLogin={renderAdmin} 
      onCustomStart={renderChoixDepart} 
    />
  </React.StrictMode>
);