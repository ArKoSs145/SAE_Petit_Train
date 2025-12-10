import React, { useState, useEffect } from 'react';
import {
  Box, Button, Grid, Typography, List, ListItemButton, ListItemText, Paper
} from '@mui/material';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

export default function Admin() {
  const [selectedTime, setSelectedTime] = useState('Total');
  const [dashboardData, setDashboardData] = useState({ stands: [], historique: [] });
  const [timeSlots, setTimeSlots] = useState(['Total']);

  // --- Chargement des données ---
  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
        
        const times = [...new Set(data.historique.map(h => h.heure))];
        setTimeSlots(['Total', ...times]);
      }
    } catch (err) {
      console.error("Erreur chargement admin:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleQuit = () => { window.location.href = "/"; };

  // --- Filtrage ---
  const filteredHistory = dashboardData.historique.filter(item => 
    selectedTime === 'Total' || item.heure === selectedTime
  );

  // --- Styles & Couleurs ---
  const headerBtnStyle = {
    backgroundColor: '#d9d9d9', color: 'black', textTransform: 'none',
    boxShadow: 'none', borderRadius: 0, fontSize: '1.1rem', px: 3,
    '&:hover': { backgroundColor: '#c0c0c0' }
  };

  const getCardColor = (nom) => {
    if (nom.includes('Poste 1')) return '#9fc3f1';
    if (nom.includes('Poste 2')) return '#b6fcce';
    if (nom.includes('Poste 3')) return '#ffb6b6';
    return '#e0e0e0';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'white', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pt: 3 }}>
        <Button variant="contained" sx={headerBtnStyle}>Télécharger</Button>
        <Typography variant="h3" sx={{ fontWeight: 400, color: 'black' }}>
          Historique des Cycles
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" sx={headerBtnStyle} onClick={fetchData}>Rafraîchir</Button>
          <Button variant="contained" onClick={handleQuit} sx={{ 
              backgroundColor: '#cc0000', color: 'white', minWidth: '50px', fontWeight: 'bold', fontSize: '1.2rem',
              borderRadius: 0, '&:hover': { backgroundColor: '#a00000' }
            }}>X</Button>
        </Box>
      </Box>

      {/* CONTENU */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', mt: 1 }}>
        
        {/* SIDEBAR */}
        <Box sx={{ width: '250px', bgcolor: '#d9d9d9', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <List component="nav" sx={{ p: 0 }}>
            {timeSlots.map((time) => (
              <ListItemButton
                key={time}
                onClick={() => setSelectedTime(time)}
                sx={{
                  borderBottom: '1px solid #999',
                  bgcolor: selectedTime === time ? 'white' : '#d9d9d9',
                  py: 2, '&:hover': { bgcolor: '#c0c0c0' }
                }}
              >
                <ListItemText 
                  primary={time} 
                  secondary={time !== 'Total' ? "Cycle" : ""}
                  primaryTypographyProps={{ fontSize: '1.2rem', textAlign: 'center', fontWeight: selectedTime === time ? 'bold' : 'normal' }}
                  secondaryTypographyProps={{ textAlign: 'center', fontSize: '0.8rem' }}
                />
                {time === 'Total' ? <ArrowDropDownIcon /> : <NavigateNextIcon />}
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* GRILLE DES STANDS */}
        <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
          <Grid container spacing={2}>
            {dashboardData.stands.map((stand) => {
              
              const arrivages = filteredHistory.filter(h => h.dest_id === stand.id);
              
              const departs = filteredHistory.filter(h => h.source_id === stand.id);
              
              return (
                <Grid item xs={12} sm={6} md={4} key={stand.id}>
                  <Paper sx={{ 
                      backgroundColor: getCardColor(stand.nom), 
                      p: 2, borderRadius: 2, minHeight: '180px',
                      display: 'flex', flexDirection: 'column', color: 'black'
                    }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>{stand.nom}</Typography>
                    
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      
                      {arrivages.length > 0 && (
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }}>Reçoit :</Typography>
                          {arrivages.map((item, idx) => (
                            <Typography key={`in-${idx}`} variant="body1">
                              • <b>{item.objet}</b> <span style={{fontSize:'0.8em'}}> (de {item.source_nom})</span>
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {arrivages.length > 0 && departs.length > 0 && <Box sx={{ my: 1, borderTop: '1px dashed #666' }} />}

                      {departs.length > 0 && (
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.7 }}>Envoie :</Typography>
                          {departs.map((item, idx) => (
                            <Typography key={`out-${idx}`} variant="body1">
                              → <b>{item.objet}</b> <span style={{fontSize:'0.8em'}}> (vers {item.dest_nom})</span>
                            </Typography>
                          ))}
                        </Box>
                      )}

                      {arrivages.length === 0 && departs.length === 0 && (
                        <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.5 }}>Aucun mouvement</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Box>
    </Box>
  );
}