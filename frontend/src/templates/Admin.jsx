import React, { useState, useEffect } from 'react';
import {
    Box, Button, Grid, Typography, List, ListItemButton, ListItemText, Paper, IconButton, ToggleButtonGroup, ToggleButton, Divider, Avatar,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SettingsIcon from '@mui/icons-material/Settings';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import AssessmentIcon from '@mui/icons-material/Assessment';
import InventoryIcon from '@mui/icons-material/Inventory'; // Icône suggérée pour le stock

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Admin({ onParametre, onApprovisionnement, onRetourAccueil, onGestionStock }) {
    const [currentView, setCurrentView] = useState('dashboard');
    const [filtreMode, setFiltreMode] = useState('Normal');
    const [dashboardData, setDashboardData] = useState({ stands: [], historique: [] });
    const [cyclesList, setCyclesList] = useState([]);
    const [selectedCycleId, setSelectedCycleId] = useState('Total');
    const [selectedCycleLabel, setSelectedCycleLabel] = useState('Total');
    const [cycleLogs, setCycleLogs] = useState([]);
    const [openClearDialog, setOpenClearDialog] = useState(false);
    const [clearing, setClearing] = useState(false);

    const fetchData = async () => {
        try {
            const resDash = await fetch(`${apiUrl}/api/admin/dashboard?mode=${filtreMode}`);
            if (resDash.ok) {
                const dataDash = await resDash.json();
                setDashboardData(dataDash);
            }
            const resCycles = await fetch(`${apiUrl}/api/admin/cycles?mode=${filtreMode}`);
            if (resCycles.ok) {
                const dataCycles = await resCycles.json();
                setCyclesList(dataCycles);
                if (currentView === 'logs' && selectedCycleId === 'Total' && dataCycles.length > 0) {
                    handleSelectCycle(dataCycles[0]);
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchCycleLogs = async (id) => {
        if (!id || id === 'Total') return;
        try {
            const res = await fetch(`${apiUrl}/api/admin/logs/${id}?mode=${filtreMode}`);
            if (res.ok) {
                const data = await res.json();
                setCycleLogs(data.logs || []);
            }
        } catch (err) { console.error(err); }
    }

    useEffect(() => { fetchData(); }, [filtreMode, currentView]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
            if (currentView === 'logs' && selectedCycleId && selectedCycleId !== 'Total') {
                fetchCycleLogs(selectedCycleId);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [currentView, selectedCycleId, filtreMode]);

    const handleSelectCycle = (cycle) => {
        setSelectedCycleId(cycle.id);
        setSelectedCycleLabel(cycle.label);
        if (cycle.id !== 'Total') fetchCycleLogs(cycle.id);
        else setCycleLogs([]);
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
            const res = await fetch(`${apiUrl}/api/admin/clear?mode=${filtreMode}`, { method: 'POST' });
            if (res.ok) {
                setCycleLogs([]);
                setSelectedCycleId('Total');
                fetchData();
            }
        } catch (err) { console.error(err); } finally {
            setClearing(false);
            setOpenClearDialog(false);
        }
    };

    const handleQuit = () => { 
        if (onRetourAccueil) {
            onRetourAccueil();
        } else {
            window.location.href = "/"; 
        }
    };

    const getCardColor = (nom) => {
        if (nom.includes('Poste 1')) return '#E3F2FD';
        if (nom.includes('Poste 2')) return '#E8F5E9';
        if (nom.includes('Poste 3')) return '#FFEBEE';
        return '#F4F5F7';
    };

    const navButtonStyle = (active) => ({
        bgcolor: active ? '#0052CC' : 'white',
        color: active ? 'white' : '#42526E',
        textTransform: 'none',
        fontWeight: 700,
        borderRadius: '8px',
        border: active ? 'none' : '1px solid #DFE1E6',
        px: 2,
        '&:hover': { bgcolor: active ? '#0747A6' : '#F4F5F7' }
    });

    // --- CORRECTION : AJOUT DE LA FONCTION MANQUANTE ---
    const headerBtnStyle = (active) => ({
        bgcolor: active ? '#0052CC' : '#F4F5F7',
        color: active ? 'white' : '#172B4D',
        textTransform: 'none',
        fontWeight: 600,
        borderRadius: '8px',
        boxShadow: 'none',
        border: '1px solid transparent',
        px: 2,
        '&:hover': { bgcolor: '#EBECF0', borderColor: '#DFE1E6' }
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#F4F5F7', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>

            {/* HEADER */}
            <Paper elevation={0} sx={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                p: 2, bgcolor: 'white', borderBottom: '1px solid #DFE1E6', borderRadius: 0 
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#172B4D', mr: 2 }}>Administration</Typography>
                    
                    <ToggleButtonGroup value={filtreMode} exclusive onChange={handleModeChange} size="small">
                        <ToggleButton value="Normal" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>Flux Normal</ToggleButton>
                        <ToggleButton value="Personnalisé" sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>Flux Perso</ToggleButton>
                    </ToggleButtonGroup>
                    
                    <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                    
                    <Button variant="outlined" size="small" startIcon={<DownloadIcon />} sx={{ textTransform: 'none', fontWeight: 600, color: '#42526E', borderColor: '#DFE1E6' }}>
                        Exporter CSV
                    </Button>
                </Box>

                {/* GROUPE BOUTONS DU MILIEU (CORRIGÉ) */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="contained"
                        onClick={() => setOpenClearDialog(true)}
                        color="error"
                        startIcon={<DeleteSweepIcon />}
                        sx={{...headerBtnStyle(false), bgcolor: '#FFEBE6', color: '#DE350B', '&:hover': { bgcolor: '#FFBDAD' }}}
                    >
                        Vider la BD
                    </Button>

                    {/* Affichage conditionnel si la fonction est passée */}
                    {onGestionStock && (
                        <Button 
                            variant="contained" 
                            onClick={onGestionStock}
                            startIcon={<InventoryIcon />}
                            sx={headerBtnStyle(false)}
                        >
                            Gestion Pièces
                        </Button>
                    )}
                </Box>

                {/* GROUPE NAVIGATION (DROITE) */}
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button variant="contained" onClick={onApprovisionnement} sx={navButtonStyle(false)} startIcon={<LocalShippingIcon />}>Délais</Button>
                    <Button variant="contained" onClick={onParametre} sx={navButtonStyle(false)} startIcon={<SettingsIcon />}>Config</Button>
                    <Button variant="contained" onClick={() => setCurrentView(currentView === 'dashboard' ? 'logs' : 'dashboard')} sx={navButtonStyle(true)} startIcon={currentView === 'dashboard' ? <AssessmentIcon /> : <HistoryIcon />}>
                        {currentView === 'dashboard' ? 'Voir Logs' : 'Voir Historique'}
                    </Button>
                    <Button onClick={handleQuit} sx={{ bgcolor: '#DE350B', color: 'white', fontWeight: 800, borderRadius: '8px', px: 2, '&:hover': { bgcolor: '#BF2600' } }}>X</Button>
                </Box>
            </Paper>

            {/* CONTENU PRINCIPAL */}
            <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>

                {/* SIDEBAR CYCLES */}
                <Box sx={{ width: '320px', bgcolor: 'white', borderRight: '1px solid #DFE1E6', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid #F4F5F7' }}>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#5E6C84', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Historique des Cycles
                        </Typography>
                    </Box>
                    <List sx={{ p: 0, overflowY: 'auto', flexGrow: 1 }}>
                        
                        {/*On cache 'Total' si on est dans la vue Logs */}
                        {currentView !== 'logs' && (
                            <ListItemButton 
                                onClick={() => handleSelectCycle({ id: 'Total', label: 'Total' })}
                                sx={{ borderBottom: '1px solid #F4F5F7', py: 2, bgcolor: selectedCycleId === 'Total' ? '#E3F2FD' : 'transparent' }}
                            >
                                <ListItemText primary="Vue Globale (Total)" primaryTypographyProps={{ fontWeight: 700, color: selectedCycleId === 'Total' ? '#0052CC' : '#172B4D' }} />
                            </ListItemButton>
                        )}

                        {cyclesList.map((cycle) => (
                            <ListItemButton
                                key={cycle.id}
                                onClick={() => handleSelectCycle(cycle)}
                                sx={{ borderBottom: '1px solid #F4F5F7', py: 2, bgcolor: selectedCycleId === cycle.id ? '#E3F2FD' : 'transparent' }}
                            >
                                <ListItemText primary={cycle.label} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: selectedCycleId === cycle.id ? 700 : 500 }} />
                                <NavigateNextIcon sx={{ color: '#B3BAC5' }} />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>

                {/* ZONE DE DONNÉES */}
                <Box sx={{ flexGrow: 1, p: 4, overflowY: 'auto', bgcolor: '#F4F5F7' }}>
                    
                    {currentView === 'dashboard' ? (
                        <Grid container spacing={3}>
                            {dashboardData.stands.map((stand) => {
                                const filteredHistory = dashboardData.historique.filter(item => selectedCycleId === 'Total' || item.cycle_id === selectedCycleId);
                                const aggregate = (items) => {
                                    const map = new Map();
                                    items.forEach(i => {
                                        const k = `${i.objet}|${i.source_nom}|${i.dest_nom}`;
                                        map.set(k, { ...i, count: (map.get(k)?.count || 0) + (i.count || 1) });
                                    });
                                    return Array.from(map.values());
                                };
                                const arrivages = aggregate(filteredHistory.filter(h => h.dest_id === stand.id && h.statut === 'Commande finie'));
                                const departs = aggregate(filteredHistory.filter(h => h.source_id === stand.id));

                                return (
                                    <Grid item xs={12} sm={6} md={4} key={stand.id}>
                                        <Paper elevation={0} sx={{ p: 3, minHeight: '220px', borderRadius: '12px', border: '1px solid #DFE1E6', bgcolor: 'white' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                                <Avatar sx={{ bgcolor: getCardColor(stand.nom), color: '#172B4D', fontWeight: 800, fontSize: '0.9rem' }}>{stand.id}</Avatar>
                                                <Typography variant="h6" sx={{ fontWeight: 800, color: '#172B4D' }}>{stand.nom}</Typography>
                                            </Box>
                                            
                                            <Box sx={{ mb: 2 }}>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#36B37E', mb: 1, textTransform: 'uppercase' }}>Arrivages</Typography>
                                                {arrivages.map((i, idx) => (
                                                    <Typography key={idx} sx={{ fontSize: '0.85rem', color: '#42526E', mb: 0.5 }}>
                                                        • <strong>{i.count > 1 ? `x${i.count} ` : ''}{i.objet}</strong> <small>depuis {i.source_nom}</small>
                                                    </Typography>
                                                ))}
                                            </Box>
                                            
                                            <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                                            
                                            <Box>
                                                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#FF991F', mb: 1, textTransform: 'uppercase' }}>Départs</Typography>
                                                {departs.map((i, idx) => (
                                                    <Typography key={idx} sx={{ fontSize: '0.85rem', color: '#42526E', mb: 0.5 }}>
                                                        → <strong>{i.count > 1 ? `x${i.count} ` : ''}{i.objet}</strong> <small>vers {i.dest_nom}</small>
                                                    </Typography>
                                                ))}
                                            </Box>
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    ) : (
                        <Paper elevation={0} sx={{ height: '100%', borderRadius: '12px', border: '1px solid #DFE1E6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '1px solid #F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="h5" sx={{ fontWeight: 800, color: '#172B4D' }}>
                                    {selectedCycleId === 'Total' ? 'Logs : Sélectionnez un cycle' : `Journaux d'activité : ${selectedCycleLabel}`}
                                </Typography>
                                <IconButton onClick={() => setCurrentView('dashboard')} sx={{ bgcolor: '#F4F5F7' }}><ArrowBackIcon /></IconButton>
                            </Box>
                            <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#172B4D', overflowY: 'auto', fontFamily: "'Fira Code', 'Courier New', monospace" }}>
                                {selectedCycleId !== 'Total' && cycleLogs.length > 0 ? (
                                    cycleLogs.map((line, index) => (
                                        <Typography key={index} sx={{ color: '#36B37E', fontSize: '0.9rem', mb: 0.8, lineHeight: 1.4 }}>
                                            <span style={{ color: '#5E6C84' }}>[{index + 1}]</span> {line}
                                        </Typography>
                                    ))
                                ) : (
                                    <Typography sx={{ color: '#5E6C84', fontStyle: 'italic', textAlign: 'center', mt: 4 }}>
                                        {cyclesList.length === 0 ? "Aucun cycle enregistré." : "Sélectionnez un cycle à gauche pour voir les détails."}
                                    </Typography>
                                )}
                            </Box>
                        </Paper>
                    )}
                </Box>
            </Box>

            {/* DIALOG PURGE */}
            <Dialog open={openClearDialog} onClose={() => setOpenClearDialog(false)} PaperProps={{ sx: { borderRadius: '12px', p: 1 } }}>
                <DialogTitle sx={{ fontWeight: 800, color: '#DE350B' }}>Confirmer la purge des données</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ color: '#42526E' }}>
                        Cette action est irréversible. Vous allez supprimer toutes les données relatives aux pièces, commandes et cycles pour le mode <strong>{filtreMode}</strong>.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenClearDialog(false)} sx={{ fontWeight: 700, color: '#5E6C84', textTransform: 'none' }}>Annuler</Button>
                    <Button onClick={handleClearDatabase} variant="contained" disabled={clearing} sx={{ bgcolor: '#DE350B', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#BF2600' } }}>
                        {clearing ? "Suppression en cours..." : "Confirmer la purge complète"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}