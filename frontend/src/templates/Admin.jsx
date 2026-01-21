/**
 * Page d'administration fusionnée.
 * Permet de visualiser l'historique (Dashboard) et les logs détaillés par cycle.
 * Supporte le filtrage par mode (Normal/Personnalisé) et la purge de la base.
 */
import React, { useState, useEffect } from 'react';
import {
    Box, Button, Grid, Typography, List, ListItemButton, ListItemText, Paper, IconButton, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@mui/material';

// Utilisation de l'URL d'API définie dans l'environnement ou par défaut
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Admin({ onParametre, onApprovisionnement }) {
    // --- ÉTATS ---
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' ou 'logs'
    const [filtreMode, setFiltreMode] = useState('Normal');

    const [dashboardData, setDashboardData] = useState({ stands: [], historique: [] });
    const [cyclesList, setCyclesList] = useState([]);

    // États pour la gestion des logs de cycles
    const [selectedCycleId, setSelectedCycleId] = useState('Total');
    const [selectedCycleLabel, setSelectedCycleLabel] = useState('Total');
    const [cycleLogs, setCycleLogs] = useState([]);

    // États pour la boîte de dialogue de suppression
    const [openClearDialog, setOpenClearDialog] = useState(false);
    const [clearing, setClearing] = useState(false);

    // --- STYLES ---
    const headerBtnStyle = (active) => ({
        backgroundColor: active ? '#a0a0a0' : '#d9d9d9',
        color: 'black',
        textTransform: 'none',
        boxShadow: 'none',
        borderRadius: 0,
        fontSize: '1.1rem',
        px: 3,
        height: '100%',
        border: 'none',
        '&.Mui-selected': {
            backgroundColor: '#a0a0a0',
            color: 'black',
            '&:hover': { backgroundColor: '#a0a0a0' }
        },
        '&:hover': { backgroundColor: '#c0c0c0' }
    });

    const getCardColor = (nom) => {
        if (nom.includes('Poste 1')) return '#9fc3f1';
        if (nom.includes('Poste 2')) return '#b6fcce';
        if (nom.includes('Poste 3')) return '#ffb6b6';
        return '#e0e0e0';
    };

    // --- CHARGEMENT DES DONNÉES ---

    const fetchData = async () => {
        try {
            // 1. Récupération des données du Dashboard (Historique condensé)
            const resDash = await fetch(`${apiUrl}/api/admin/dashboard?mode=${filtreMode}`);
            if (resDash.ok) {
                const dataDash = await resDash.json();
                setDashboardData(dataDash);
            }

            // 2. Récupération de la liste des cycles
            const resCycles = await fetch(`${apiUrl}/api/admin/cycles?mode=${filtreMode}`);
            if (resCycles.ok) {
                const dataCycles = await resCycles.json();
                setCyclesList(dataCycles);
                
                // Si on passe en vue Log et qu'aucun cycle n'est sélectionné, on prend le premier
                if (currentView === 'logs' && selectedCycleId === 'Total' && dataCycles.length > 0) {
                    handleSelectCycle(dataCycles[0]);
                }
            }
        } catch (e) {
            console.error("Erreur chargement données admin:", e);
        }
    };

    const fetchCycleLogs = async (id) => {
        if (!id || id === 'Total') return;
        try {
            const res = await fetch(`${apiUrl}/api/admin/logs/${id}?mode=${filtreMode}`);
            if (res.ok) {
                const data = await res.json();
                setCycleLogs(data.logs || []);
            }
        } catch (err) {
            console.error("Erreur chargement logs:", err);
        }
    }

    // Effet lors du changement de mode ou de vue
    useEffect(() => {
        fetchData();
    }, [filtreMode, currentView]);

    // Rafraîchissement automatique (polling) toutes les 5 secondes
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
            if (currentView === 'logs' && selectedCycleId && selectedCycleId !== 'Total') {
                fetchCycleLogs(selectedCycleId);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [currentView, selectedCycleId, filtreMode]);

    // --- HANDLERS ---

    const handleSelectCycle = (cycle) => {
        setSelectedCycleId(cycle.id);
        setSelectedCycleLabel(cycle.label);
        if (cycle.id !== 'Total') {
            fetchCycleLogs(cycle.id);
        } else {
            setCycleLogs([]);
        }
    }

    const handleModeChange = (event, nextMode) => {
        if (nextMode !== null) {
            setFiltreMode(nextMode);
            setSelectedCycleId('Total');
            setSelectedCycleLabel('Total');
            setCycleLogs([]);
        }
    };

    const handleClearDatabase = async () => {
        setClearing(true);
        try {
            const res = await fetch(`${apiUrl}/api/admin/clear?mode=${filtreMode}`, {
                method: 'POST'
            });
            if (res.ok) {
                setCycleLogs([]);
                setSelectedCycleId('Total');
                fetchData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setClearing(false);
            setOpenClearDialog(false);
        }
    };

    const handleQuit = () => {
        window.location.href = "/";
    };

    const handleDownload = () => {
        const type = currentView === 'dashboard' ? 'dashboard' : 'logs';
        
        if (type === 'logs' && (!selectedCycleId || selectedCycleId === 'Total')) {
            alert("Veuillez sélectionner un cycle pour exporter ses logs.");
            return;
        }

        const params = new URLSearchParams({
            type: type,
            mode: filtreMode,
            cycle_id: selectedCycleId
        });

        // Déclenche le téléchargement du fichier CSV
        window.location.href = `${apiUrl}/api/admin/export-csv?${params.toString()}`;
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#333', overflow: 'hidden' }}>

            {/* HEADER */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', p: 2, bgcolor: 'white' }}>
                
                {/* BLOC GAUCHE : Téléchargement et Filtres */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" onClick={handleDownload} sx={headerBtnStyle(false)}>Télécharger</Button>
                    <ToggleButtonGroup
                        value={filtreMode}
                        exclusive
                        onChange={handleModeChange}
                        sx={{ border: 'none', borderRadius: 0, gap: 1 }}
                    >
                        <ToggleButton value="Normal" sx={headerBtnStyle(filtreMode === 'Normal')}>
                            {currentView === 'dashboard' ? 'Historique Normal' : 'Logs Normaux'}
                        </ToggleButton>
                        <ToggleButton value="Personnalisé" sx={headerBtnStyle(filtreMode === 'Personnalisé')}>
                            {currentView === 'dashboard' ? 'Historique Perso' : 'Logs Perso'}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* BLOC CENTRE : Titre */}
                <Typography variant="h3" sx={{ fontWeight: 400, color: 'black', textAlign: 'center' }}>
                    {currentView === 'dashboard' ? 'Historique' : 'Page log'}
                </Typography>

                {/* BLOC DROITE : Actions globales */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                        variant="contained"
                        onClick={onApprovisionnement}
                        sx={headerBtnStyle(false)}
                        startIcon={<LocalShippingIcon />}
                    >
                        Approvisionnement
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => setOpenClearDialog(true)}
                        sx={headerBtnStyle(false)}
                    >
                        Vider la BD
                    </Button>

                    <Button variant="contained" onClick={onParametre} sx={headerBtnStyle(false)}>Échange</Button>

                    <Button
                        variant="contained"
                        sx={headerBtnStyle(currentView === 'logs')}
                        onClick={() => setCurrentView(currentView === 'dashboard' ? 'logs' : 'dashboard')}
                    >
                        {currentView === 'dashboard' ? 'Log' : 'Historique'}
                    </Button>

                    <Button variant="contained" onClick={handleQuit} sx={{
                        backgroundColor: '#cc0000', color: 'white', minWidth: '50px', fontWeight: 'bold', fontSize: '1.2rem',
                        borderRadius: 0, boxShadow: 'none', '&:hover': { backgroundColor: '#a00000' }
                    }}>X</Button>
                </Box>
            </Box>

            {/* CONTENU PRINCIPAL */}
            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', mt: 1, bgcolor: '#333' }}>

                {/* VUE DASHBOARD (HISTORIQUE PAR STAND) */}
                {currentView === 'dashboard' && (
                    <Box sx={{ display: 'flex', width: '100%', height: '100%', bgcolor: 'white' }}>
                        <Box sx={{ width: '300px', bgcolor: '#d9d9d9', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
                            <List component="nav" sx={{ p: 0 }}>
                                <ListItemButton
                                    onClick={() => handleSelectCycle({ id: 'Total', label: 'Total' })}
                                    sx={{ borderBottom: '1px solid #999', py: 2, bgcolor: selectedCycleId === 'Total' ? 'white' : 'transparent' }}
                                >
                                    <ListItemText primary="Total" primaryTypographyProps={{ fontSize: '1.2rem', textAlign: 'center' }} />
                                </ListItemButton>

                                {cyclesList.map((cycle) => (
                                    <ListItemButton
                                        key={cycle.id}
                                        onClick={() => handleSelectCycle(cycle)}
                                        sx={{ borderBottom: '1px solid #999', py: 2, bgcolor: selectedCycleId === cycle.id ? 'white' : 'transparent' }}
                                    >
                                        <ListItemText primary={cycle.label} primaryTypographyProps={{ fontSize: '1.0rem', textAlign: 'center' }} />
                                        <NavigateNextIcon />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Box>

                        <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
                            <Grid container spacing={2}>
                                {dashboardData.stands.map((stand) => {
                                    const filteredHistory = dashboardData.historique.filter(item => selectedCycleId === 'Total' || item.cycle_id === selectedCycleId);

                                    let rawArrivages = filteredHistory.filter(h => h.dest_id === stand.id && h.statut === 'Commande finie');
                                    let rawDeparts = filteredHistory.filter(h => h.source_id === stand.id);

                                    const aggregateItems = (items) => {
                                        const map = new Map();
                                        items.forEach(item => {
                                            const key = `${item.objet}|${item.source_nom}|${item.dest_nom}`;
                                            if (!map.has(key)) {
                                                map.set(key, { ...item, count: item.count || 1 });
                                            } else {
                                                map.get(key).count += (item.count || 1);
                                            }
                                        });
                                        return Array.from(map.values());
                                    };

                                    const arrivages = aggregateItems(rawArrivages);
                                    const departs = aggregateItems(rawDeparts);

                                    return (
                                        <Grid item xs={12} sm={6} md={4} key={stand.id}>
                                            <Paper sx={{ backgroundColor: getCardColor(stand.nom), p: 2, minHeight: '180px', borderRadius: 0, boxShadow: 1 }}>
                                                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{stand.nom}</Typography>

                                                {arrivages.map((i, idx) => (
                                                    <div key={idx}>
                                                        • {i.objet} {i.count > 1 && <strong>(x{i.count})</strong>} <small>(de {i.source_nom})</small>
                                                    </div>
                                                ))}

                                                {arrivages.length > 0 && departs.length > 0 && <hr style={{ opacity: 0.3 }} />}

                                                {departs.map((i, idx) => (
                                                    <div key={idx}>
                                                        → {i.objet} {i.count > 1 && <strong>(x{i.count})</strong>} <small>(vers {i.dest_nom})</small>
                                                    </div>
                                                ))}
                                            </Paper>
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Box>
                    </Box>
                )}

                {/* VUE LOGS (DÉTAILS TECHNIQUES) */}
                {currentView === 'logs' && (
                    <Box sx={{ display: 'flex', width: '100%', height: '100%', bgcolor: '#333', p: 2, gap: 2 }}>
                        <Paper sx={{ width: '300px', bgcolor: '#d9d9d9', overflowY: 'auto', borderRadius: 0 }}>
                            <Box sx={{ p: 2, borderBottom: '1px solid #999', fontWeight: 'bold', textAlign: 'center' }}>
                                Cycles passés ({filtreMode})
                            </Box>
                            <List component="nav" sx={{ p: 0 }}>
                                {cyclesList.map((cycle) => (
                                    <ListItemButton
                                        key={cycle.id}
                                        onClick={() => handleSelectCycle(cycle)}
                                        sx={{
                                            borderBottom: '1px solid #bbb',
                                            bgcolor: selectedCycleId === cycle.id ? '#a0a0a0' : 'transparent',
                                            '&:hover': { bgcolor: '#bfbfbf' }
                                        }}
                                    >
                                        <ListItemText primary={cycle.label} primaryTypographyProps={{ fontSize: '1.0rem', textAlign: 'center' }} />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Paper>

                        <Paper sx={{ flexGrow: 1, bgcolor: 'white', display: 'flex', flexDirection: 'column', borderRadius: 0, overflow: 'hidden' }}>
                            <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ textAlign: 'center', width: '100%' }}>
                                    <Typography variant="h4">
                                        {selectedCycleId === 'Total' ? 'Veuillez sélectionner un cycle' : `Logs du ${selectedCycleLabel}`}
                                    </Typography>
                                </Box>
                                <IconButton sx={{ bgcolor: '#d9d9d9', borderRadius: 0 }} onClick={() => setCurrentView('dashboard')}>
                                    <ArrowBackIcon />
                                </IconButton>
                            </Box>

                            <Box sx={{
                                flexGrow: 1, m: 4, mt: 0, p: 4,
                                bgcolor: '#d9d9d9', borderRadius: 0,
                                overflowY: 'auto', fontFamily: 'monospace', fontSize: '1.1rem'
                            }}>
                                {selectedCycleId !== 'Total' && cycleLogs.length > 0 ? (
                                    cycleLogs.map((line, index) => (
                                        <div key={index} style={{ marginBottom: '8px' }}>{line}</div>
                                    ))
                                ) : (
                                    <div style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                        {selectedCycleId === 'Total' ? "Cliquez sur un cycle à gauche pour voir les détails." : "Aucune donnée pour ce cycle."}
                                    </div>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* DIALOG CONFIRMATION DE SUPPRESSION */}
            <Dialog open={openClearDialog} onClose={() => setOpenClearDialog(false)}>
                <DialogTitle>Confirmation de suppression</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Cette action va supprimer définitivement toutes les données de la base (Pièces, Boîtes, Commandes, Cycles, etc.) pour le mode <strong>{filtreMode}</strong>. 
                        Les logs seront perdus.
                        <br /><br />
                        Voulez-vous vraiment continuer ?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenClearDialog(false)}>Annuler</Button>
                    <Button onClick={handleClearDatabase} color="error" variant="contained" disabled={clearing}>
                        {clearing ? "Suppression..." : "Confirmer la purge"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}