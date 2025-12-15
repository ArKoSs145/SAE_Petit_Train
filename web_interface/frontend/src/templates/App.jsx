import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LoginPopup from '../templates/popup/LoginPopup.jsx';

export default function App({ onContinue, onAdminLogin }) {
    const [showLogin, setShowLogin] = useState(false);

    const handleStartCycle = async () => {
        try {
            await fetch('http://localhost:8000/api/cycle/start', { 
                method: 'POST' 
            });
            console.log("Nouveau cycle démarré");
            onContinue();
        } catch (err) {
            console.error("Erreur démarrage cycle:", err);
            onContinue();
        }
    }

    // --- Actions ---
    function buttonPersonalisé() {
        console.log("Avec un départ personnalisé");
        // Ajoutez ici la logique de navigation si nécessaire
    }

    function quit() {
        // Tentative de fermeture standard pour les navigateurs configurés (ex: mode Kiosk)
        window.open("about:blank", "_self");
        window.close();
    }

    // --- Styles communs ---
    const mainButtonStyle = {
        backgroundColor: '#d9d9d9', // Gris clair
        color: 'black',
        textTransform: 'none', // Garder la casse normale
        fontSize: '1.2rem',
        padding: '15px 40px',
        width: '400px', // Largeur fixe pour uniformité
        maxWidth: '90%',
        borderRadius: 0, // Bords carrés comme sur l'image
        boxShadow: 'none',
        '&:hover': {
            backgroundColor: '#c0c0c0',
            boxShadow: 'none',
        }
    };

    return (
        <Box sx={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            bgcolor: 'white',
            overflow: 'hidden',
            position: 'relative'
        }}>
            
            {/* --- Bouton Admin (Haut Droite) --- */}
            <Box sx={{ position: 'absolute', top: 30, right: 30, textAlign: 'center' }}>
                <Paper 
                    elevation={3}
                    onClick={() => setShowLogin(true)}
                    sx={{ 
                        width: 60, 
                        height: 60, 
                        bgcolor: '#e0e0e0', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        mb: 0.5,
                        borderRadius: 1
                    }}
                >
                    <LockIcon sx={{ color: '#f57f17', fontSize: 30 }} /> {/* Cadenas Orange */}
                </Paper>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Admin</Typography>
            </Box>

            {/* --- Contenu Central --- */}
            <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 4 
            }}>
                {/* Titre */}
                <Typography variant="h2" sx={{ 
                    color: '#9c27b0', // Violet
                    fontWeight: 400,
                    textAlign: 'center'
                }}>
                    Kanban Numérique
                </Typography>

                {/* Sous-titre */}
                <Typography variant="h5" sx={{ 
                    color: 'black', 
                    mb: 2,
                    textAlign: 'center'
                }}>
                    Comment commencer la journée ?
                </Typography>

                {/* Boutons d'action */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Button 
                        variant="contained" 
                        onClick={onContinue}
                        sx={mainButtonStyle}
                    >
                        Continuer la journée précédente
                    </Button>

                    <Button 
                        variant="contained" 
                        onClick={handleStartCycle}
                        sx={mainButtonStyle}
                    >
                        Avec un départ personnalisé
                    </Button>
                </Box>
            </Box>

            {/* --- Footer Quitter (Bas) --- */}
            <Box 
                onClick={quit}
                sx={{ 
                    width: '100%', 
                    bgcolor: 'red', 
                    py: 3, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#d32f2f' }
                }}
            >
                <Typography variant="h5" sx={{ color: 'black' }}>
                    Quitter
                </Typography>
            </Box>

            {/* --- Popup de Connexion --- */}
            {/* On passe la prop onLoginSuccess qui correspond à la fonction renderAdmin */}
            <LoginPopup 
                open={showLogin} 
                onClose={() => setShowLogin(false)} 
                onLoginSuccess={onAdminLogin}
            />
        </Box>
    );
}