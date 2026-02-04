import React, { useState, useEffect } from 'react';
import { 
    Box, Button, Typography, Paper, Grid, MenuItem, Select, FormControl, 
    InputLabel, List, ListItem, ListItemText, IconButton, Card, CardContent, 
    Divider, Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import StopIcon from '@mui/icons-material/Stop';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ConfigDepartPerso({ onRetour, onLancer }) {
    const [cycleActive, setCycleActive] = useState(false);
    const mode = "Personnalisé";
    const [stands, setStands] = useState({});
    const [stocks, setStocks] = useState([]);
    const [commandes, setCommandes] = useState([]);

    const [selectedPieceId, setSelectedPieceId] = useState('');
    const [selectedStatut, setSelectedStatut] = useState('A récupérer');

    const handleClearAll = async () => {
        if (!window.confirm("Voulez-vous vider toute la liste des missions ?")) return;
        const res = await fetch(`${apiUrl}/api/admin/custom-order/all`, { method: 'DELETE' });
        if (res.ok) fetchCommandes();
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchCommandes, 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const resStands = await fetch(`${apiUrl}/api/stands`);
            setStands(await resStands.json());

            const resStocks = await fetch(`${apiUrl}/api/admin/stocks`);
            const dataStocks = await resStocks.json();
            setStocks(Array.isArray(dataStocks) ? dataStocks : []);
            
            fetchCommandes();
        } catch (e) { console.error("Erreur fetch:", e); }
    };

    const fetchCommandes = async () => {
        const res = await fetch(`${apiUrl}/api/commandes/en_cours?mode=${mode}`);
        setCommandes(await res.json());
    };

    const handleAddCommande = async () => {
        const piece = stocks.find(s => Number(s.idBoite) === Number(selectedPieceId));
        
        if (!piece) {
            alert("Erreur : Objet non trouvé.");
            return;
        }
        
        if (!piece.idPosteAssigne) {
            alert("Cette boîte n'a pas de poste de destination assigné !");
            return;
        }

        try {
            const response = await fetch(`${apiUrl}/api/admin/custom-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idBoite: Number(piece.idBoite),
                    idPoste: Number(piece.idPosteAssigne),
                    statut: selectedStatut
                })
            });

            if (response.ok) {
                setSelectedPieceId('');
                fetchCommandes(); 
            }
        } catch (error) { console.error(error); }
    };

    const handleDeleteCommande = async (id) => {
        await fetch(`${apiUrl}/api/commande/${id}`, { method: 'DELETE' });
        fetchCommandes();
    };

    const handleToggleCycle = async () => {
        try {
            if (cycleActive) {
                await fetch(`${apiUrl}/api/cycle/stop`, { method: 'POST' });
                setCycleActive(false);
            } else {
                const res = await fetch(`${apiUrl}/api/cycle/start?mode=${mode}`, { method: 'POST' });
                const data = await res.json();
                if (data.status === "ok") setCycleActive(true);
                else alert(data.message);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        const checkCycle = async () => {
            const res = await fetch(`${apiUrl}/api/cycles?mode=${mode}`);
            if (res.ok) {
                const cycles = await res.json();
                const isRunning = cycles.some(c => c.date_fin === null);
                setCycleActive(isRunning);
            }
        };
        checkCycle();
    }, []);

    // Styles
    const sectionHeaderStyle = {
        p: 2, 
        borderBottom: '1px solid #DFE1E6', 
        bgcolor: '#FAFBFC',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center'
    };

    return (
        <Box sx={{ 
            p: 3, 
            bgcolor: '#F4F5F7', 
            minHeight: '100vh', 
            display: 'flex', 
            flexDirection: 'column', 
            fontFamily: "'Inter', sans-serif" 
        }}>
            
            {/* Header */}
            <Paper elevation={0} sx={{ 
                p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, 
                borderRadius: '8px', border: '1px solid #DFE1E6' 
            }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={onRetour} 
                    sx={{ color: '#42526E', fontWeight: 700, textTransform: 'none' }}
                >
                    Retour
                </Button>
                <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 800, color: '#172B4D' }}>
                    Configuration du Départ Personnalisé
                </Typography>
                <Button 
                    variant="contained" 
                    size="large" 
                    startIcon={<RocketLaunchIcon />} 
                    onClick={onLancer}
                    sx={{ 
                        bgcolor: '#0052CC', fontWeight: 700, textTransform: 'none',
                        '&:hover': { bgcolor: '#0747A6' }
                    }}
                >
                    Lancer l'exercice
                </Button>
            </Paper>

            <Grid container spacing={3} sx={{ flexGrow: 1 }}>
                {/* COLONNE GAUCHE - CONFIGURATION */}
                <Grid item xs={12} md={4} lg={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        
                        {/* Carte Contrôle Cycle */}
                        <Paper elevation={0} sx={{ borderRadius: '8px', border: '1px solid #DFE1E6', overflow: 'hidden' }}>
                            <Box sx={sectionHeaderStyle}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#5E6C84', textTransform: 'uppercase' }}>
                                    Pilotage
                                </Typography>
                                <Chip 
                                    label={cycleActive ? "EN COURS" : "ARRÊTÉ"} 
                                    color={cycleActive ? "success" : "default"} 
                                    size="small" 
                                    sx={{ fontWeight: 700 }}
                                />
                            </Box>
                            <Box sx={{ p: 2 }}>
                                <Button 
                                    variant="contained" 
                                    fullWidth 
                                    color={cycleActive ? "warning" : "success"}
                                    startIcon={cycleActive ? <StopIcon /> : <PlayArrowIcon />}
                                    onClick={handleToggleCycle}
                                    sx={{ py: 1, fontWeight: 700, textTransform: 'none' }}
                                >
                                    {cycleActive ? "Arrêter le cycle" : "Démarrer le cycle"}
                                </Button>
                            </Box>
                        </Paper>

                        {/* Carte Ajout Commande */}
                        <Paper elevation={0} sx={{ borderRadius: '8px', border: '1px solid #DFE1E6', overflow: 'hidden' }}>
                            <Box sx={sectionHeaderStyle}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#5E6C84', textTransform: 'uppercase' }}>
                                    Nouvelle Mission
                                </Typography>
                            </Box>
                            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Objet à envoyer</InputLabel>
                                    <Select 
                                        value={selectedPieceId} 
                                        label="Objet à envoyer"
                                        onChange={(e) => setSelectedPieceId(e.target.value)}
                                    >
                                        {stocks.map((s) => (
                                            <MenuItem key={s.idBoite} value={s.idBoite}>
                                                {s.nom} <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>[{s.code}]</Typography>
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>Action initiale</InputLabel>
                                    <Select 
                                        value={selectedStatut} 
                                        label="Action initiale"
                                        onChange={(e) => setSelectedStatut(e.target.value)}
                                    >
                                        <MenuItem value="A récupérer">Aller le chercher (Magasin)</MenuItem>
                                        <MenuItem value="A déposer">Déjà chargé (A Livrer)</MenuItem>
                                    </Select>
                                </FormControl>

                                <Button 
                                    variant="outlined" 
                                    fullWidth 
                                    startIcon={<AddCircleIcon />} 
                                    onClick={handleAddCommande}
                                    disabled={!selectedPieceId}
                                    sx={{ mt: 1, fontWeight: 600, textTransform: 'none' }}
                                >
                                    Ajouter à la liste
                                </Button>
                            </Box>
                        </Paper>
                    </Box>
                </Grid>

                {/* COLONNE DROITE - TABLEAU RÉCAPITULATIF */}
                <Grid item xs={12} md={8} lg={9}>
                    <Paper elevation={0} sx={{ 
                        height: '100%', minHeight: '500px', display: 'flex', flexDirection: 'column', 
                        borderRadius: '8px', border: '1px solid #DFE1E6', overflow: 'hidden' 
                    }}>
                        <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #DFE1E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#172B4D' }}>
                                Liste des Missions
                            </Typography>
                            <Button color="error" size="small" onClick={handleClearAll} startIcon={<DeleteIcon />} sx={{ fontWeight: 600, textTransform: 'none' }}>
                                Tout vider
                            </Button>
                        </Box>
                        
                        <Grid container sx={{ flexGrow: 1 }}>
                            {/* Liste À RÉCUPÉRER */}
                            <Grid item xs={12} md={6} sx={{ borderRight: { md: '1px solid #DFE1E6' }, display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ p: 1.5, bgcolor: '#FFF7E6', borderBottom: '1px solid #FFEDCC' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#B65C02', textTransform: 'uppercase' }}>
                                        ▼ À récupérer (Magasin)
                                    </Typography>
                                </Box>
                                <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
                                    {commandes.filter(c => c.statut === "A récupérer").map(c => (
                                        <ListItem key={c.id} divider sx={{ '&:hover': { bgcolor: '#FAFBFC' } }}>
                                            <ListItemText 
                                                primary={<Typography sx={{ fontWeight: 600, color: '#172B4D' }}>{c.nom_piece}</Typography>} 
                                                secondary={`Depuis : ${stands[c.magasin_id] || '?'}`} 
                                            />
                                            <IconButton onClick={() => handleDeleteCommande(c.id)} size="small" sx={{ color: '#DE350B' }}>
                                                <DeleteIcon fontSize="small"/>
                                            </IconButton>
                                        </ListItem>
                                    ))}
                                    {commandes.filter(c => c.statut === "A récupérer").length === 0 && (
                                        <Typography sx={{ p: 3, color: '#97A0AF', fontStyle: 'italic', textAlign: 'center' }}>Aucune mission</Typography>
                                    )}
                                </List>
                            </Grid>

                            {/* Liste À DÉPOSER */}
                            <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ p: 1.5, bgcolor: '#E3FCEF', borderBottom: '1px solid #ABF5D1' }}>
                                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#006644', textTransform: 'uppercase' }}>
                                        ▼ À livrer (Poste)
                                    </Typography>
                                </Box>
                                <List sx={{ flexGrow: 1, overflow: 'auto', p: 0 }}>
                                    {commandes.filter(c => c.statut === "A déposer").map(c => (
                                        <ListItem key={c.id} divider sx={{ '&:hover': { bgcolor: '#FAFBFC' } }}>
                                            <ListItemText 
                                                primary={<Typography sx={{ fontWeight: 600, color: '#172B4D' }}>{c.nom_piece}</Typography>} 
                                                secondary={`Vers : ${stands[c.poste] || '?'}`} 
                                            />
                                            <IconButton onClick={() => handleDeleteCommande(c.id)} size="small" sx={{ color: '#DE350B' }}>
                                                <DeleteIcon fontSize="small"/>
                                            </IconButton>
                                        </ListItem>
                                    ))}
                                    {commandes.filter(c => c.statut === "A déposer").length === 0 && (
                                        <Typography sx={{ p: 3, color: '#97A0AF', fontStyle: 'italic', textAlign: 'center' }}>Aucune mission</Typography>
                                    )}
                                </List>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}