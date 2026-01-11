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

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Admin({ onParametre, onApprovisionnement }) {
    // --- États ---
    const [currentView, setCurrentView] = useState('dashboard');
    const [filtreMode, setFiltreMode] = useState('Normal');

    const [historique, setHistorique] = useState([]);
    const [timeSlots, setTimeSlots] = useState(['Total']);
    const [dashboardData, setDashboardData] = useState({ stands: [], historique: [] });
    const [cyclesList, setCyclesList] = useState([]);

    // États pour la gestion des logs de cycles
    const [selectedCycleId, setSelectedCycleId] = useState('Total');
    const [selectedCycleLabel, setSelectedCycleLabel] = useState('Total');
    const [cycleLogs, setCycleLogs] = useState([]);

    // --- Vider la BD ---
    const [openClearDialog, setOpenClearDialog] = useState(false);
    const [clearing, setClearing] = useState(false);

    // --- Styles ---
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

    // --- Chargement Données ---

    const fetchDashboardData = async () => {
        try {
            // 1. Récupération des données du Dashboard avec le filtre de mode
            const resDash = await fetch(`${apiUrl}/api/admin/dashboard?mode=${filtreMode}`);
            if (resDash.ok) {
                const dataDash = await resDash.json();

                setDashboardData(dataDash);
                setHistorique(dataDash.historique);

                // Extraction des créneaux horaires uniques pour le sélecteur
                const times = [...new Set(dataDash.historique.map(h => h.heure))];
                setTimeSlots(['Total', ...times]);
            }

            // 2. Récupération de la liste des cycles filtrée
            const resCycles = await fetch(`${apiUrl}/api/admin/cycles?mode=${filtreMode}`);
            if (resCycles.ok) {
                const dataCycles = await resCycles.json();
                setCyclesList(dataCycles);
            }
        } catch (e) {
            console.error("Erreur chargement admin:", e);
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

    // Effet au changement de mode
    useEffect(() => {
        fetchDashboardData();
    }, [filtreMode]);

    // Effet de rafraîchissement automatique
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboardData();
            if (currentView === 'logs' && selectedCycleId && selectedCycleId !== 'Total') {
                fetchCycleLogs(selectedCycleId);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [currentView, selectedCycleId, filtreMode]);

    // --- Handlers ---
    const handleSelectCycle = (cycle) => {
        setSelectedCycleId(cycle.id);
        setSelectedCycleLabel(cycle.label);
        if (cycle.id !== 'Total') {
            fetchCycleLogs(cycle.id);
        } else {
            setCycleLogs([]);
        }
    }

    const handleQuit = () => {
        window.location.href = "/";
    };

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
            const res = await fetch(`${apiUrl}/api/admin/clear`, {
                method: 'POST'
            });
            if (res.ok) {
                setCycleLogs([]);
                setSelectedCycleId('Total');
                fetchDashboardData();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setClearing(false);
            setOpenClearDialog(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#333', overflow: 'hidden' }}>

            {/* HEADER */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', p: 2, bgcolor: 'white' }}>

                {/* BLOC GAUCHE */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button variant="contained" sx={headerBtnStyle(false)}>Télécharger</Button>
                    <ToggleButtonGroup
                        value={filtreMode}
                        exclusive
                        onChange={handleModeChange}
                        sx={{ border: 'none', borderRadius: 0, gap: 1 }}
                    >
                        <ToggleButton value="Normal" sx={headerBtnStyle(filtreMode === 'Normal')}>
                            Logs Normaux
                        </ToggleButton>
                        <ToggleButton value="Personnalisé" sx={headerBtnStyle(filtreMode === 'Personnalisé')}>
                            Logs Perso
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                {/* BLOC CENTRE */}
                <Typography variant="h3" sx={{ fontWeight: 400, color: 'black', textAlign: 'center' }}>
                    {currentView === 'dashboard' ? 'Historique' : 'Page log'}
                </Typography>

                {/* BLOC DROITE */}
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

                {/* VUE DASHBOARD */}
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

                {/* VUE LOGS */}
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
                                        {selectedCycleId === 'Total' ? "Cliquez sur un cycle à gauche pour voir les détails." : "Aucune donnée pour ce mode."}
                                    </div>
                                )}
                            </Box>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* DIALOG CONFIRMATION */}
            <Dialog open={openClearDialog} onClose={() => setOpenClearDialog(false)}>
                <DialogTitle>Confirmation</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Cette action va supprimer définitivement toutes les Commandes et tous les cycles de la base ({filtreMode}).
                        Voulez-vous vraiment continuer ?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenClearDialog(false)}>Annuler</Button>
                    <Button onClick={handleClearDatabase} color="error" variant="contained" disabled={clearing}>
                        {clearing ? "Suppression..." : "Confirmer"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}