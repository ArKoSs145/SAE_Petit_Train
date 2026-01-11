import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid, MenuItem, Select, FormControl, InputLabel, List, ListItem, ListItemText, IconButton, Card, CardContent } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import StopIcon from '@mui/icons-material/Stop';

export default function ConfigDepartPerso({ onRetour, onLancer }) {
    const [cycleActive, setCycleActive] = useState(false);
    const mode = "Personnalisé";
    const [stands, setStands] = useState({});
    const [stocks, setStocks] = useState([]);
    const [commandes, setCommandes] = useState([]);
    const [trainPos, setTrainPos] = useState("");

    const [selectedPieceId, setSelectedPieceId] = useState('');
    const [selectedStatut, setSelectedStatut] = useState('A récupérer');

    const handleClearAll = async () => {
    if (!window.confirm("Voulez-vous vider toute la liste des missions ?")) return;
    const res = await fetch('http://localhost:8000/api/admin/custom-order/all', { method: 'DELETE' });
    if (res.ok) fetchCommandes();
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchCommandes, 2000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const resStands = await fetch('http://localhost:8000/api/stands');
            setStands(await resStands.json());

            const resStocks = await fetch('http://localhost:8000/api/admin/stocks');
            const dataStocks = await resStocks.json();
            setStocks(Array.isArray(dataStocks) ? dataStocks : []);

            const resTrain = await fetch(`http://localhost:8000/api/train/position?mode=${mode}`);
            const dataTrain = await resTrain.json();
            setTrainPos(dataTrain.position || "");
            
            fetchCommandes();
        } catch (e) { console.error("Erreur fetch:", e); }
    };

    const fetchCommandes = async () => {
        const res = await fetch(`http://localhost:8000/api/commandes/en_cours?mode=${mode}`);
        setCommandes(await res.json());
    };

    const handleAddCommande = async () => {
        // IMPORTANT : On convertit selectedPieceId en nombre pour la comparaison
        const piece = stocks.find(s => Number(s.idBoite) === Number(selectedPieceId));
        
        if (!piece) {
            alert("Erreur : Objet non trouvé dans la liste des stocks.");
            console.error("ID cherché:", selectedPieceId, "dans stocks:", stocks);
            return;
        }
        
        if (!piece.idPosteAssigne) {
            alert("Cette boîte n'a pas de poste de destination assigné en base de données !");
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/api/admin/custom-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idBoite: Number(piece.idBoite),
                    idPoste: Number(piece.idPosteAssigne),
                    statut: selectedStatut
                })
            });

            if (response.ok) {
                // Réinitialiser la sélection après l'ajout pour éviter les doublons accidentels
                setSelectedPieceId('');
                fetchCommandes(); 
            } else {
                const errorData = await response.json();
                console.error("Erreur API:", errorData);
            }
        } catch (error) {
            console.error("Erreur réseau:", error);
        }
    };

    const handleUpdateTrain = async (newPos) => {
        setTrainPos(newPos);
        await fetch(`http://localhost:8000/api/train/position?mode=${mode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ position: newPos })
        });
    };

    const handleDeleteCommande = async (id) => {
        await fetch(`http://localhost:8000/api/commande/${id}`, { method: 'DELETE' });
        fetchCommandes();
    };

    const handleToggleCycle = async () => {
    try {
        if (cycleActive) {
            await fetch('http://localhost:8000/api/cycle/stop', { method: 'POST' });
            setCycleActive(false);
        } else {
            // On utilise bien le mode "Personnalisé" ici
            const res = await fetch(`http://localhost:8000/api/cycle/start?mode=Personnalisé`, { method: 'POST' });
            const data = await res.json();
            if (data.status === "ok") {
                setCycleActive(true);
            } else {
                alert(data.message);
            }
        }
    } catch (err) {
        console.error("Erreur cycle:", err);
        }
    };

    useEffect(() => {
    const checkCycle = async () => {
        const res = await fetch(`http://localhost:8000/api/cycles?mode=Personnalisé`);
        if (res.ok) {
            const cycles = await res.json();
            const isRunning = cycles.some(c => c.date_fin === null);
            setCycleActive(isRunning);
        }
    };
    checkCycle();
    }, []);

    return (
        <Box sx={{ p: 2, bgcolor: '#eceff1', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <Paper sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onRetour}>Retour</Button>
                <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 'bold', color: '#263238' }}>
                    Configuration du Départ Personnalisé
                </Typography>
                <Button variant="contained" color="success" size="large" startIcon={<PlayArrowIcon />} onClick={onLancer}>
                    Lancer l'exercice
                </Button>
            </Paper>

            <Grid container spacing={2} sx={{ flexGrow: 1 }}>
                {/* COLONNE GAUCHE (Plus étroite) - CONFIGURATION */}
                <Grid item xs={12} md={4} lg={3}>
                    <Card sx={{ mb: 2, borderRadius: 2, boxShadow: 3, bgcolor: cycleActive ? '#e8f5e9' : 'white' }}>
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Statut du Cycle</Typography>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                color={cycleActive ? "warning" : "success"}
                                startIcon={cycleActive ? <StopIcon /> : <PlayArrowIcon />}
                                onClick={handleToggleCycle}
                                sx={{ py: 1, fontWeight: 'bold' }}
                            >
                                {cycleActive ? "Arrêter le cycle" : "Démarrer le cycle"}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                        <CardContent>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Nouvelle Commande</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>Objet à envoyer</InputLabel>
                                        <Select 
                                            value={selectedPieceId} 
                                            label="Objet à envoyer"
                                            onChange={(e) => setSelectedPieceId(e.target.value)}
                                            fullWidth
                                        >
                                            {stocks.map((s) => (
                                                <MenuItem key={s.idBoite} value={s.idBoite}>
                                                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                                                        {/* NOM : Prend toute la place à gauche */}
                                                        <Typography sx={{ flexGrow: 1, fontWeight: 'medium' }}>
                                                            {s.nom}
                                                        </Typography>
                                                        
                                                        {/* CODE : Petit, gris et à droite */}
                                                        <Typography variant="caption" sx={{ color: 'text.secondary', ml: 2, fontStyle: 'italic' }}>
                                                            [{s.code}]
                                                        </Typography>
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                </FormControl>

                                <FormControl fullWidth size="small">
                                    <InputLabel>Action du train</InputLabel>
                                    <Select 
                                        value={selectedStatut} 
                                        label="Action du train"
                                        onChange={(e) => setSelectedStatut(e.target.value)}
                                    >
                                        <MenuItem value="A récupérer">Aller le chercher (Magasin)</MenuItem>
                                        <MenuItem value="A déposer">Déjà chargé (Aller livrer)</MenuItem>
                                    </Select>
                                </FormControl>

                                <Button 
                                    variant="contained" 
                                    fullWidth 
                                    startIcon={<AddCircleIcon />} 
                                    onClick={handleAddCommande}
                                    sx={{ py: 1.5, mt: 1 }}
                                >
                                    Ajouter la commande
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* COLONNE DROITE (Large) - TABLEAU RÉCAPITULATIF */}
                <Grid item xs={12} md={8} lg={9}>
                    <Paper sx={{ height: '80vh', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden', boxShadow: 3 }}>
                        <Box sx={{ bgcolor: '#263238', color: 'white', p: 2 }}>
                            <Typography variant="h6">Ordres de mission du train personnalisé</Typography>
                            <Button color="error" variant="outlined" size="small" onClick={handleClearAll} startIcon={<DeleteIcon />}>
                                Tout vider
                            </Button>
                        </Box>
                        <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
                            {/* Liste À RÉCUPÉRER */}
                            <Grid item xs={6} sx={{ borderRight: '2px solid #cfd8dc', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ p: 2, bgcolor: '#fff3e0', borderBottom: '1px solid #ffe0b2', textAlign: 'center' }}>
                                    <Typography variant="button" sx={{ fontWeight: 'bold', color: '#e65100' }}>Étape 1 : À récupérer en magasin</Typography>
                                </Box>
                                <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                                    {commandes.filter(c => c.statut === "A récupérer").map(c => (
                                        <ListItem key={c.id} divider sx={{ bgcolor: 'white', mb: 1, borderRadius: 1 }}>
                                            <ListItemText 
                                                primary={<Typography sx={{fontWeight:'bold'}}>{c.nom_piece}</Typography>} 
                                                secondary={`Magasin source : ${stands[c.magasin_id] || '?'}`} 
                                            />
                                            <IconButton onClick={() => handleDeleteCommande(c.id)} color="error"><DeleteIcon/></IconButton>
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>

                            {/* Liste À DÉPOSER */}
                            <Grid item xs={6} sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderBottom: '1px solid #c8e6c9', textAlign: 'center' }}>
                                    <Typography variant="button" sx={{ fontWeight: 'bold', color: '#2e7d32' }}>Étape 2 : À livrer aux postes</Typography>
                                </Box>
                                <List sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                                    {commandes.filter(c => c.statut === "A déposer").map(c => (
                                        <ListItem key={c.id} divider sx={{ bgcolor: 'white', mb: 1, borderRadius: 1 }}>
                                            <ListItemText 
                                                primary={<Typography sx={{fontWeight:'bold'}}>{c.nom_piece}</Typography>} 
                                                secondary={`Destination : ${stands[c.poste] || 'Poste inconnu'}`} 
                                            />
                                            <IconButton onClick={() => handleDeleteCommande(c.id)} color="error"><DeleteIcon/></IconButton>
                                        </ListItem>
                                    ))}
                                </List>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}