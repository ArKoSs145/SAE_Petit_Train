import React from 'react'
import Accueil from './templates/Accueil.jsx'
import './styles.css'
import ReactDOM from "react-dom/client";
import Circuit from './templates/Circuit.jsx';
import Admin from './templates/Admin.jsx';
import Parametre from './templates/Parametre.jsx';
import Approvisionnement from './templates/Approvisionnement.jsx';
import ChoixDepart from './templates/ChoixDepart.jsx';
import ConfigDepartPerso from './templates/ConfigDepartPerso';


  const root = ReactDOM.createRoot(document.getElementById("root"));

const renderApprovisionnement = () => {
    root.render(
      <React.StrictMode>
        <Approvisionnement onRetourAdmin={renderAdmin}/>
      </React.StrictMode>
    );
}

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

const renderAccueil = () => {
    root.render(
      <React.StrictMode>
        <Accueil onContinue={() => renderCircuit("Normal")} onAdminLogin={renderAdmin} onCustomStart={renderChoixDepart}/>
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


  const renderChoixDepart = () => {
    root.render(
      <React.StrictMode>
        <ChoixDepart 
          onRetour={renderApp} 
          onConfigurer={renderConfigPerso}
          onLancer={() => renderBase("Personnalisé")} 
        />
      </React.StrictMode>
    );
  };


root.render(
  <React.StrictMode>
    <Accueil onContinue={() => renderCircuit("Normal")} onAdminLogin={renderAdmin} onCustomStart={renderChoixDepart} />
  </React.StrictMode>
);

  const renderConfiguration = () => {
      root.render(
        <React.StrictMode>
          <ConfigurationPerso 
              onRetour={renderChoixDepart} 
              onLancer={() => renderBase("Personnalisé")} 
          />
        </React.StrictMode>
      );
  };

  const renderConfigPerso = () => {
    root.render(
      <React.StrictMode>
        <ConfigDepartPerso 
          onRetour={renderChoixDepart} 
          onLancer={() => renderBase("Personnalisé")} 
        />
      </React.StrictMode>
    );
  }

  const lancerExercicePerso = () => {
      root.render(
          <React.StrictMode>
              <Base mode="Personnalisé" onApp={renderApp} />
          </React.StrictMode>
      );
  };