  import React from 'react'
  import App from './templates/App.jsx'
  import './styles.css'
  import ReactDOM from "react-dom/client";
  import Base from './templates/Base.jsx';
  import Admin from './templates/Admin.jsx';
  import Parametre from './templates/Parametre.jsx';
  import ChoixDepart from './templates/ChoixDepart.jsx';
  import ConfigDepartPerso from './templates/ConfigDepartPerso';

  const root = ReactDOM.createRoot(document.getElementById("root"));


  const renderBase = (mode = "Normal") => {
    root.render(
      <React.StrictMode>
        <Base mode={mode} onApp={renderApp} />
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
          <App 
            onContinue={() => renderBase("Normal")} // Force le mode Normal ici
            onAdminLogin={renderAdmin} 
            onCustomStart={renderChoixDepart}
          />
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
      <App 
        onContinue={() => renderBase("Normal")} 
        onAdminLogin={renderAdmin} 
        onCustomStart={renderChoixDepart} // <-- Correction du nom ici
      />
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