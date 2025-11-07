import React, { useEffect, useRef, useState } from 'react'
import LoginPopup from '../templates/popup/LoginPopup.jsx'

export default function App({ onContinue }) {

    const imgStyle = { width: 32, height: 32, objectFit: 'contain' }
    const [showLogin, setShowLogin] = useState(false);

    function buttonContinuer() {
        onContinue();
    }

    function buttonPersonalisé() {
        console.log("Avec un départ personnalisé")
    }

    function quit() {
        window.open("about:blank", "_self");
        window.close();
    }

    return (
        <div>
            <div>
                <h1>
                    Kanban Numérique
                </h1>
                <h2>Comment voulez-vous commencer la journée ?</h2>
                <button onClick={buttonContinuer}>Continuer la journée précédente</button>
                <button onClick={buttonPersonalisé}>Avec un départ personnalisé</button>
                <button onClick={() => setShowLogin(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <img src="./images/train.png" alt="Admin" style={imgStyle} />
                </button>

                <LoginPopup 
                    open={showLogin} 
                    onClose={() => setShowLogin(false)} 
                />
            </div>
            <div>
                <button onClick={quit}>Quitter l'application</button>
            </div>
        </div>
    )
}