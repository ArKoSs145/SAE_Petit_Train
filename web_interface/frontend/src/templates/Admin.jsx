import React, { useState, useEffect } from 'react';
import {
  Box, Button, Grid, Typography, List, ListItemButton, ListItemText, Paper, IconButton
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function Admin() {
  // --- États ---
  const [currentView, setCurrentView] = useState('dashboard');
  
  // États Dashboard
  const [dashboardData, setDashboardData] = useState({ stands: [], historique: [] });
  const [selectedTimeDashboard, setSelectedTimeDashboard] = useState('Total');
  const [timeSlots, setTimeSlots] = useState(['Total']);

  // États Logs
  const [cyclesList, setCyclesList] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [selectedCycleLabel, setSelectedCycleLabel] = useState("");
  const [cycleLogs, setCycleLogs] = useState([]);

  // --- Chargement Données ---

  const fetchDashboard = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
        const times = [...new Set(data.historique.map(h => h.heure))];
        setTimeSlots(['Total', ...times]);
      }
    } catch (err) { console.error(err); }
  };

  const fetchCycles = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/cycles');
      if (res.ok) {
        const data = await res.json();
        setCyclesList(data);
        if (data.length > 0 && !selectedCycleId) {
            handleSelectCycle(data[0]);
        }
      }
    } catch (err) { console.error(err); }
  }

  const fetchCycleLogs = async (id) => {
    try {
        const res = await fetch(`http://localhost:8000/api/admin/logs/${id}`);
        if(res.ok) {
            const data = await res.json();
            setCycleLogs(data.logs);
        }
    } catch(err) { console.error(err); }
  }

    useEffect(() => {
        fetchCycles();
        fetchDashboard();
        // Si on est sur une vue Logs avec un cycle sélectionné, on rafraichit aussi les logs
        if (currentView === 'logs' && selectedCycleId !== 'Total') {
            fetchCycleLogs(selectedCycleId);
        }
    }, [currentView]); // <-- S'exécute à chaque changement d'onglet

    // 2. Rafraîchissement automatique (Toutes les 5 sec)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchDashboard();
            fetchCycles();
            if (currentView === 'logs' && selectedCycleId !== 'Total') {
                fetchCycleLogs(selectedCycleId);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [currentView, selectedCycleId]);

  // --- Handlers ---
  const handleSelectCycle = (cycle) => {
      setSelectedCycleId(cycle.id);
      setSelectedCycleLabel(cycle.label);
      fetchCycleLogs(cycle.id);
  }

  const handleQuit = () => { window.location.href = "/"; };

  // --- Styles ---
  const headerBtnStyle = (active) => ({
    backgroundColor: active ? '#a0a0a0' : '#d9d9d9',
    color: 'black', textTransform: 'none',
    boxShadow: 'none', borderRadius: 0, fontSize: '1.1rem', px: 3,
    '&:hover': { backgroundColor: '#c0c0c0' }
  });

  const getCardColor = (nom) => {
    if (nom.includes('Poste 1')) return '#9fc3f1';
    if (nom.includes('Poste 2')) return '#b6fcce';
    if (nom.includes('Poste 3')) return '#ffb6b6';
    return '#e0e0e0';
  };

  // --- RENDER ---
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: '#333', overflow: 'hidden' }}>
      
      {/* HEADER (Commun) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pt: 3, bgcolor: 'white' }}>
        <Button variant="contained" sx={headerBtnStyle(false)}>Télécharger</Button>
        
        <Typography variant="h3" sx={{ fontWeight: 400, color: 'black' }}>
          {currentView === 'dashboard' ? 'Historique' : 'Page log'}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" sx={headerBtnStyle(false)}>Échange</Button>
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
                {/* Sidebar Dashboard */}
                <Box sx={{ width: '300px', bgcolor: '#d9d9d9', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
                    <List component="nav" sx={{ p: 0 }}>
                        {/* Option Total */}
                        <ListItemButton
                            onClick={() => handleSelectCycle({id: 'Total', label: 'Total'})}
                            sx={{ borderBottom: '1px solid #999', py: 2, bgcolor: selectedCycleId === 'Total' ? 'white' : 'transparent' }}
                        >
                            <ListItemText primary="Total" primaryTypographyProps={{ fontSize: '1.2rem', textAlign: 'center' }} />
                        </ListItemButton>

                        {/* Liste des Cycles (dynamique) */}
                        {cyclesList.map((cycle) => (
                        <ListItemButton
                            key={cycle.id}
                            onClick={() => handleSelectCycle(cycle)}
                            sx={{ borderBottom: '1px solid #999', py: 2, bgcolor: selectedCycleId === cycle.id ? 'white' : 'transparent' }}
                        >
                            {/* Affiche le label formaté par le back (ex: 10h00 - 10h15) */}
                            <ListItemText primary={cycle.label} primaryTypographyProps={{ fontSize: '1.0rem', textAlign: 'center' }} />
                            <NavigateNextIcon />
                        </ListItemButton>
                        ))}
                    </List>
                </Box>

                {/* Grille Dashboard */}
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
                                    <Paper sx={{ backgroundColor: getCardColor(stand.nom), p: 2, minHeight: '180px' }}>
                                        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{stand.nom}</Typography>
                                        
                                        {/* Affichage avec gestion du (xN) */}
                                        {arrivages.map((i, idx) => (
                                            <div key={idx}>
                                                • {i.objet} {i.count > 1 && <strong>(x{i.count})</strong>} <small>(de {i.source_nom})</small>
                                            </div>
                                        ))}
                                        
                                        {arrivages.length > 0 && departs.length > 0 && <hr style={{opacity:0.3}}/>}
                                        
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
                
                {/* Sidebar Logs (Sans Total) */}
                <Paper sx={{ width: '300px', bgcolor: '#d9d9d9', overflowY: 'auto', borderRadius: 0 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid #999', fontWeight: 'bold' }}>
                        Cycles passés
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

                {/* Contenu Log */}
                <Paper sx={{ flexGrow: 1, bgcolor: 'white', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ textAlign: 'center', width: '100%' }}>
                            {/* Gestion de l'affichage du titre pour ne jamais afficher "Total" */}
                            <Typography variant="h4">
                                {selectedCycleId === 'Total' ? 'Veuillez sélectionner un cycle' : `Logs du ${selectedCycleLabel}`}
                            </Typography>
                        </Box>
                        <IconButton sx={{ bgcolor: '#d9d9d9', borderRadius: 1 }} onClick={() => setCurrentView('dashboard')}>
                            <ArrowBackIcon />
                        </IconButton>
                    </Box>
                    
                    <Box sx={{ 
                        flexGrow: 1, m: 4, mt: 0, p: 4, 
                        bgcolor: '#d9d9d9', borderRadius: 4, 
                        overflowY: 'auto', fontFamily: 'monospace', fontSize: '1.1rem' 
                    }}>
                        {selectedCycleId !== 'Total' && cycleLogs.length > 0 ? (
                            cycleLogs.map((line, index) => (
                                <div key={index} style={{ marginBottom: '8px' }}>{line}</div>
                            ))
                        ) : (
                            <div style={{ fontStyle: 'italic', opacity: 0.6 }}>
                                {selectedCycleId === 'Total' ? "Cliquez sur un cycle à gauche pour voir les détails." : "Aucune donnée."}
                            </div>
                        )}
                    </Box>
                </Paper>
            </Box>
        )}
      </Box>
    </Box>
  );
}