import React, { useState, useEffect } from 'react'
import {
  Dialog,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  Typography
} from '@mui/material'
import '../../../styles/PopupLivraison.css';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const GRID_ROWS = 8;
const GRID_COLS = 2;

// itemLocations a été supprimé : on utilise les données de la tâche directement.

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

const STORE_IDS = ['4', '5', '6', '7'];

export default function PopupLivraison({ open, onClose, posteId, tasks, onDeliver, onMissing, posteColor }) {
  
  const [clickedTasks, setClickedTasks] = useState(new Set());
  const color = posteColor || getPosteColor(posteId);
  const isMagasin = STORE_IDS.includes(String(posteId));

  useEffect(() => {
    if (open) {
      setClickedTasks(new Set());
    }
  }, [open]);

  // On utilise directement les tâches filtrées passées par Base.jsx
  const tasksForPoste = tasks; 

  // --- 1. Filtrage DYNAMIQUE basé sur les données serveur ---
  const getTasksAt = (r, c) => {
    return tasksForPoste.filter(task => {
      // On compare la ligne de la grille (r) avec celle de la tâche (task.gridRow)
      // Note : r commence à 0, gridRow commence à 1
      return task.gridRow === (r + 1) && task.gridCol === (c + 1);
    });
  };

  const handleCellClick = (cellTasks) => {
    if (!cellTasks || cellTasks.length === 0) return;

    setClickedTasks(prevClickedTasks => {
      const newSet = new Set(prevClickedTasks);
      // Vérifie si toutes les tâches de la cellule sont déjà sélectionnées
      const allSelected = cellTasks.every(t => newSet.has(t.id));

      if (allSelected) {
        // Si tout est sélectionné, on désélectionne tout
        cellTasks.forEach(t => newSet.delete(t.id));
      } else {
        // Sinon, on sélectionne tout
        cellTasks.forEach(t => newSet.add(t.id));
      }
      return newSet;
    });
  };

  const gridCells = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cellTasks = getTasksAt(r, c);
      const hasTask = cellTasks.length > 0;
      // La cellule est visuellement validée si toutes ses tâches sont dans clickedTasks
      const isFullyChecked = hasTask && cellTasks.every(t => clickedTasks.has(t.id));
      // On prend le nom du premier item (supposé identique ou représentatif)
      const itemName = hasTask ? cellTasks[0].item : '';

      let stockDisplay = null;
      let content = '';

      if (hasTask && cellTasks[0]) {
        content = cellTasks[0].item;
        
        if (isMagasin) {
            stockDisplay = cellTasks[0].stock !== undefined ? cellTasks[0].stock : '?';
        }
      }

      gridCells.push(
        <Box
          key={`${r}-${c}`}
          className="grid-cell"
          onClick={() => hasTask && handleCellClick(cellTasks)}
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
          }}
        >
          {hasTask && cellTasks[0] && (
            <>
              <span>{content}</span>
              {isMagasin && (
                <span style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                    (Stock: {stockDisplay})
                </span>
              )}
            </>
          )}
          {/* Badge xN si plusieurs tâches sur la même case */}
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
          
          {isFullyChecked && (
            <CheckCircleIcon sx={{
              position: 'absolute', color: 'white', fontSize: '2.5rem', pointerEvents: 'none', 
            }} />
          )}
        </Box>
      );
    }
  }
  
  const handleValidate = () => {
    clickedTasks.forEach(taskId => {
      onDeliver(taskId);
    });
    onClose();
  };

  const handleMissing = async () => {
    for (let taskId of clickedTasks) {
      try {
        await fetch(`http://127.0.0.1:8000/api/commande/${taskId}/manquant`, {
            method: 'PUT'
        });
        if (onMissing) {
          onMissing(taskId);
        }

      } catch (error) {
        console.error("Erreur signalement manquant:", error);
      }
    }
    onClose();
  };

  const allTasksClicked = tasksForPoste.length > 0 && clickedTasks.size === tasksForPoste.length;
  const anyTaskClicked = clickedTasks.size > 0;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box sx={{
          display: 'grid', gridTemplateColumns: '3fr 1fr 2fr', gap: '20px',
          width: '100vw', height: '100vh', padding: '24px', boxSizing: 'border-box', backgroundColor: '#f0f0f0',
        }}>
        
        {/* GRILLE */}
        <Box sx={{
            display: 'grid', gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: '1px', border: '3px solid #666', backgroundColor: '#666',
          }}>
          {gridCells}
        </Box>

        {/* BOUTONS */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 0' }}>
          <Button variant="contained" onClick={onClose} sx={{ padding: '25px', fontSize: '1.5rem', backgroundColor: '#d9d9d9', color: 'black' }}>
            Retour
          </Button>
          {isMagasin && (
            <Button 
              variant="contained" 
              onClick={handleMissing} 
              disabled={!anyTaskClicked}
              sx={{ 
                  padding: '20px', 
                  fontSize: '1.2rem', 
                  backgroundColor: '#ff6b6b', 
                  color: 'white',
                  '&:hover': { backgroundColor: '#d32f2f' }
              }}>
              Produit Manquant
            </Button>
          )}
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