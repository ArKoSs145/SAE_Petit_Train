import React, { useState, useEffect } from 'react'
import {
  Dialog,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  Typography,
  CircularProgress
} from '@mui/material'
import '../../../styles/PopupLivraison.css'; 
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const getPosteColor = (id) => {
  if (id === "1") return '#9fc3f1'; 
  else if (id === "2") return '#b6fcce'; 
  else if (id === "3") return '#ffb6b6'; 
  else if (id === "4") return '#FFC481'; 
  else if (id === "5") return '#e7e42bff'; 
  else if (id === "6") return '#B6A9FF'; 
  else if (id === "7") return '#ffb1e5'; 
  else return '#5e5e5eff'
};

export default function PopupLivraison({ open, onClose, posteId, tasks, onDeliver, posteColor }) {
  
  const [clickedTasks, setClickedTasks] = useState(new Set());
  const [gridConfig, setGridConfig] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // <--- NOUVEAU : État d'erreur

  const color = posteColor || getPosteColor(posteId);

  // 1. Chargement de la configuration
  useEffect(() => {
    console.log("🔄 DÉBUT DU CHARGEMENT DE /etagere.json");
    setLoading(true);
    setError(null);

    fetch('/etagere.json')
      .then(res => {
        console.log(`📡 Statut HTTP: ${res.status}`);
        if (!res.ok) {
            throw new Error(`Fichier introuvable ou erreur serveur (HTTP ${res.status})`);
        }
        // Vérification du type de contenu
        const contentType = res.headers.get("content-type");
        if (contentType && !contentType.includes("application/json")) {
            throw new Error("Le fichier reçu n'est pas du JSON (C'est peut-être une page HTML d'erreur)");
        }
        return res.json();
      })
      .then(data => {
        console.log("✅ JSON chargé avec succès :", data);
        if (!data.items || !data.layout) {
            throw new Error("Le JSON est mal formé (il manque 'items' ou 'layout')");
        }
        setGridConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("❌ ERREUR CRITIQUE :", err);
        setError(err.message); // On stocke le message pour l'afficher
        setLoading(false);     // On arrête le chargement même en cas d'erreur
      });
  }, []);

  useEffect(() => {
    if (open) {
      setClickedTasks(new Set());
    }
  }, [open]);

  const tasksForPoste = tasks; 

  const getTasksAt = (r, c) => {
    return tasksForPoste.filter(task => {
      return task.gridRow === (r + 1) && task.gridCol === (c + 1);
    });
  };

  const handleCellClick = (cellTasks) => {
    if (!cellTasks || cellTasks.length === 0) return;

    setClickedTasks(prevClickedTasks => {
      const newSet = new Set(prevClickedTasks);
      const allSelected = cellTasks.every(t => newSet.has(t.id));

      if (allSelected) {
        cellTasks.forEach(t => newSet.delete(t.id));
      } else {
        cellTasks.forEach(t => newSet.add(t.id));
      }
      return newSet;
    });
  };

  const handleValidate = () => {
    clickedTasks.forEach(taskId => {
      onDeliver(taskId);
    });
    onClose();
  };

  const allTasksClicked = tasksForPoste.length > 0 && clickedTasks.size === tasksForPoste.length;

  // --- RENDU DE LA GRILLE DYNAMIQUE (LOGIQUE CORRIGÉE) ---
  let gridContent;
  
  if (loading) {
    // CAS 1 : Chargement
    gridContent = (
        <Box sx={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'100%', color:'white' }}>
            <CircularProgress color="inherit" />
            <Typography sx={{ mt: 2 }}>Chargement de l'étagère...</Typography>
        </Box>
    );
  } else if (error) {
    // CAS 2 : Erreur (C'est ici que tu verras le problème)
    gridContent = (
        <Box sx={{ display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', height:'100%', color:'#ffcccc', textAlign:'center', p:2 }}>
            <Typography variant="h5" sx={{ mb: 1 }}>⚠️ Erreur</Typography>
            <Typography variant="body1">{error}</Typography>
            <Typography variant="caption" sx={{ mt: 2, fontStyle:'italic' }}>
                Vérifiez la console (F12) pour plus de détails.
            </Typography>
        </Box>
    );
  } else if (gridConfig && gridConfig.items) {
    // CAS 3 : Succès
    gridContent = gridConfig.items.map((item) => {
      const cellTasks = getTasksAt(item.r, item.c);
      const hasTask = cellTasks.length > 0;
      const isFullyChecked = hasTask && cellTasks.every(t => clickedTasks.has(t.id));
      const displayText = hasTask ? cellTasks[0].item : item.val;

      return (
        <Box
          key={item.id}
          className={`grid-cell ${item.isMerged ? 'merged' : ''}`}
          onClick={() => handleCellClick(cellTasks)}
          style={item.style} 
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            border: '2px solid #666',
            backgroundColor: hasTask ? color : '#d9d9d9',
            color: hasTask ? 'white' : '#333',
            position: 'relative',
            cursor: hasTask ? 'pointer' : 'default',
            transition: 'opacity 0.2s ease',
            opacity: isFullyChecked ? 0.5 : 1.0, 
            height: '100%', 
            width: '100%'
          }}
        >
          {hasTask && cellTasks.length > 1 && (
            <Box sx={{
              position: 'absolute', top: 5, right: 5,
              backgroundColor: 'red', color: 'white',
              borderRadius: '50%', width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', boxShadow: 2, zIndex: 10
            }}>
              x{cellTasks.length}
            </Box>
          )}

          {displayText}
          
          {isFullyChecked && (
            <CheckCircleIcon sx={{
              position: 'absolute', color: 'white', fontSize: '2.5rem', pointerEvents: 'none', 
            }} />
          )}
        </Box>
      );
    });
  } else {
      // Cas de secours
      gridContent = <Typography color="white">Configuration vide.</Typography>;
  }

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box sx={{
          display: 'grid', gridTemplateColumns: '3fr 1fr 2fr', gap: '20px',
          width: '100vw', height: '100vh', padding: '24px', boxSizing: 'border-box', backgroundColor: '#f0f0f0',
        }}>
        
        {/* GRILLE */}
        <Box sx={{
            display: 'grid',
            gridTemplateRows: gridConfig ? gridConfig.layout.templateRows : '1fr',
            gridTemplateColumns: gridConfig ? gridConfig.layout.templateColumns : '1fr',
            gap: '1px', 
            border: '3px solid #666', 
            backgroundColor: '#666',
            height: '100%', 
            overflow: 'auto'
          }}>
          {gridContent}
        </Box>

        {/* BOUTONS */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 0' }}>
          <Button variant="contained" onClick={onClose} sx={{ padding: '25px', fontSize: '1.5rem', backgroundColor: '#d9d9d9', color: 'black' }}>
            Retour
          </Button>
          <Button variant="contained" onClick={handleValidate} disabled={!allTasksClicked} 
            sx={{ padding: '25px', fontSize: '1.5rem', backgroundColor: '#d9d9d9', color: 'black', opacity: !allTasksClicked ? 0.5 : 1.0 }}>
            Valider
          </Button>
        </Box>

        {/* LISTE SCROLLABLE */}
        <Box sx={{
            display: 'flex', flexDirection: 'column', backgroundColor: '#d9d9d9',
            border: '2px solid #aaa', padding: '20px', height: '100%', boxSizing: 'border-box', overflow: 'hidden'
          }}>
          <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>Commandes :</Typography>
          <Typography variant="h5" component="h3" sx={{ mb: 2 }}>Poste {posteId}</Typography>
          
          <Box sx={{
              backgroundColor: color, color: 'white', borderRadius: '8px', padding: '15px 20px',
              flexGrow: 1, overflowY: 'auto', minHeight: 0
            }}>
            {tasksForPoste.length > 0 ? (
              <List>
                {tasksForPoste.map((task) => (
                  <ListItem key={task.id} sx={{ padding: '0 0 10px 0' }}>
                    <ListItemText 
                      primary={(clickedTasks.has(task.id) ? '✅ ' : '• ') + `Récupérer ${task.item}`}
                      primaryTypographyProps={{ 
                        fontSize: '1.2rem', fontWeight: 'bold',
                        textDecoration: clickedTasks.has(task.id) ? 'line-through' : 'none',
                        opacity: clickedTasks.has(task.id) ? 0.7 : 1.0,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>Aucune tâche en attente.</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  )
}