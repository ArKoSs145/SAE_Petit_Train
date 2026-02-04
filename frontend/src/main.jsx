/**
 * Point d'entrée principal de l'application React fusionné.
 * Gère le routage de l'application via des fonctions de rendu manuel.
 */
import React from 'react'
import ReactDOM from "react-dom/client";
import './styles.css'

// --- IMPORTS DES COMPOSANTS ---
import Accueil from './templates/Accueil.jsx'
import Circuit from './templates/Circuit.jsx';
import Admin from './templates/Admin.jsx';
import Parametre from './templates/Parametre.jsx';
import Approvisionnement from './templates/Approvisionnement.jsx';
import ConfigDepartPerso from './templates/ConfigDepartPerso';

// Initialisation du noeud racine React
const root = ReactDOM.createRoot(document.getElementById("root"));

// --- FONCTIONS DE RENDU (ROUTAGE) ---

/**
 * Affiche l'écran d'accueil
 */
const renderAccueil = () => {
  root.render(
    <React.StrictMode>
      <Accueil 
        onContinue={() => renderCircuit("Normal")} 
        onAdminLogin={renderAdmin} 
        onCustomStart={renderConfigPerso}
      />
    </React.StrictMode>
  );
};

/**
 * Affiche l'écran principal du circuit
 * @param {string} mode - "Normal" ou "Personnalisé"
 */
const renderCircuit = (mode = "Normal") => {
  root.render(
    <React.StrictMode>
      <Circuit mode={mode} onApp={renderAccueil}/>
    </React.StrictMode>
  );
};

/**
 * Affiche le panneau d'administration
 */
const renderAdmin = () => {
  root.render(
    <React.StrictMode>
      <Admin 
        onParametre={renderParametre}
        onApprovisionnement={renderApprovisionnement} 
        onRetourAccueil={renderAccueil} 
      />
    </React.StrictMode>
  );
};

/**
 * Affiche la gestion de l'approvisionnement
 */
const renderApprovisionnement = () => {
  root.render(
    <React.StrictMode>
      <Approvisionnement onRetourAdmin={renderAdmin}/>
    </React.StrictMode>
  );
}

/**
 * Affiche les paramètres du système
 */
const renderParametre = () => {
  root.render(
    <React.StrictMode>
      <Parametre onRetourAdmin={renderAdmin}/>
    </React.StrictMode>
  );
}

/**
 * Affiche la configuration détaillée du départ personnalisé
 */
const renderConfigPerso = () => {
  root.render(
    <React.StrictMode>
      <ConfigDepartPerso 
        onRetour={renderAccueil} 
        onLancer={() => renderCircuit("Personnalisé")} 
      />
    </React.StrictMode>
  );
}

// --- RENDU INITIAL ---
// L'application démarre systématiquement sur l'écran d'accueil
renderAccueil();