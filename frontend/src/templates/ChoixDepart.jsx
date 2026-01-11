import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export default function ChoixDepart({ onRetour, onConfigurer, onLancer }) {
    // Style des boutons centraux (identique à App.jsx)
    const buttonStyle = {
        backgroundColor: '#d9d9d9',
        color: 'black',
        textTransform: 'none',
        fontSize: '1.2rem',
        padding: '15px 40px',
        width: '400px',
        maxWidth: '90%',
        borderRadius: 0,
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
            
            {/* --- Contenu Central --- */}
            <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: 4 
            }}>
                <Typography variant="h2" sx={{ 
                    color: '#9c27b0', 
                    fontWeight: 400,
                    textAlign: 'center'
                }}>
                    Départ Personnalisé
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Button 
                        variant="contained" 
                        onClick={onConfigurer}
                        sx={buttonStyle}
                    >
                        Configurer le départ personnalisé
                    </Button>

                    <Button 
                        variant="contained" 
                        onClick={onLancer}
                        sx={buttonStyle}
                    >
                        Lancer le départ personnalisé
                    </Button>
                </Box>
            </Box>

            {/* --- Footer Retour (Bandeau en bas) --- */}
            {/* On reprend exactement le style du bouton Quitter de App.jsx */}
            <Box 
                onClick={onRetour}
                sx={{ 
                    width: '100%', 
                    bgcolor: 'red',
                    py: 3, 
                    textAlign: 'center', 
                    cursor: 'pointer',
                    borderTop: '1px solid #ccc',
                    '&:hover': { bgcolor: '#d32f2f' }
                }}
            >
                <Typography variant="h5" sx={{ color: 'black' }}>
                    Retour
                </Typography>
            </Box>
        </Box>
    );
}