import React, { useState, useEffect, useRef } from 'react';
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

  // Référence pour l'input caché
  const fileInputRef = useRef(null);

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
    if (currentView === 'dashboard') {
        fetchDashboard();
        const interval = setInterval(fetchDashboard, 5000);
        return () => clearInterval(interval);
    } else {
        fetchCycles();
    }
  }, [currentView]);

  // --- Handlers ---
  const handleSelectCycle = (cycle) => {
      setSelectedCycleId(cycle.id);
      setSelectedCycleLabel(cycle.label);
      fetchCycleLogs(cycle.id);
  }

  const handleQuit = () => { window.location.href = "/"; };

  // --- HANDLERS UPLOAD CONFIGURATION (JSON Method) ---

  // 1. Ouvre le sélecteur de fichier
  const onConfigurationClick = () => {
    if (fileInputRef.current) {
        fileInputRef.current.click();
    }
  };

  // 2. Lit le fichier et l'envoie comme texte JSON
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm(`Voulez-vous mettre à jour la configuration avec le fichier "${file.name}" ?`)) {
        event.target.value = null; 
        return;
    }

    // Lecture du fichier côté client
    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const textContent = e.target.result; // Contenu du CSV

        try {
            console.log("Envoi de la configuration...");
            // Envoi au format JSON (pas besoin de python-multipart)
            const res = await fetch('http://localhost:8000/api/admin/upload-config', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    csv_content: textContent 
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                alert("✅ " + data.message);
            } else {
                const errData = await res.json();
                alert("❌ Erreur : " + (errData.detail || "Erreur serveur"));
            }
        } catch (err) {
            console.error("Erreur upload:", err);
            alert("❌ Erreur de connexion au serveur.");
        } finally {
            // Reset de l'input
            event.target.value = null;
        }
    };

    // Lance la lecture
    reader.readAsText(file);
  };

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
          
          {/* INPUT CACHÉ */}
          <input 
            type="file" 
            ref={fileInputRef}
            style={{ display: 'none' }} 
            accept=".csv"
            onChange={handleFileChange}
          />

          {/* BOUTON CONFIGURATION */}
          <Button 
            variant="contained" 
            sx={headerBtnStyle(false)}
            onClick={onConfigurationClick}
          >
            Configuration
          </Button>

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
                <Box sx={{ width: '250px', bgcolor: '#d9d9d9', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
                    <List component="nav" sx={{ p: 0 }}>
                        {timeSlots.map((time) => (
                        <ListItemButton
                            key={time}
                            onClick={() => setSelectedTimeDashboard(time)}
                            sx={{ borderBottom: '1px solid #999', py: 2, bgcolor: selectedTimeDashboard === time ? 'white' : 'transparent' }}
                        >
                            <ListItemText primary={time} primaryTypographyProps={{ fontSize: '1.2rem', textAlign: 'center' }} />
                            {time === 'Total' ? <ArrowDropDownIcon /> : <NavigateNextIcon />}
                        </ListItemButton>
                        ))}
                    </List>
                </Box>

                {/* Grille Dashboard */}
                <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
                    <Grid container spacing={2}>
                        {dashboardData.stands.map((stand) => {
                            const filteredHistory = dashboardData.historique.filter(item => selectedTimeDashboard === 'Total' || item.heure === selectedTimeDashboard);
                            
                            let rawArrivages = filteredHistory.filter(h => h.dest_id === stand.id);
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
                                        
                                        {/* Affichage arrivages */}
                                        {arrivages.map((i, idx) => (
                                            <div key={idx}>
                                                • {i.objet} {i.count > 1 && <strong>(x{i.count})</strong>} <small>(de {i.source_nom})</small>
                                            </div>
                                        ))}
                                        
                                        {arrivages.length > 0 && departs.length > 0 && <hr style={{opacity:0.3}}/>}
                                        
                                        {/* Affichage départs */}
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
                
                {/* Sidebar Logs */}
                <Paper sx={{ width: '300px', bgcolor: '#d9d9d9', overflowY: 'auto', borderRadius: 0 }}>
                    <Box sx={{ p: 2, borderBottom: '1px solid #999', fontWeight: 'bold' }}>
                        20 derniers (cycles)
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
                                <ListItemText primary={cycle.label} primaryTypographyProps={{ fontSize: '1.1rem', textAlign: 'center' }} />
                            </ListItemButton>
                        ))}
                    </List>
                </Paper>

                {/* Contenu Log */}
                <Paper sx={{ flexGrow: 1, bgcolor: 'white', display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
                    <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ textAlign: 'center', width: '100%' }}>
                            <Typography variant="h4">Logs du {selectedCycleLabel.split(' à ')[0]}</Typography>
                            <Typography variant="h4">à {selectedCycleLabel.split(' à ')[1]}</Typography>
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
                        {cycleLogs.length > 0 ? (
                            cycleLogs.map((line, index) => (
                                <div key={index} style={{ marginBottom: '8px' }}>{line}</div>
                            ))
                        ) : (
                            <div>Sélectionnez un cycle pour voir les détails...</div>
                        )}
                    </Box>
                </Paper>
             </Box>
        )}

      </Box>
    </Box>
  );
}