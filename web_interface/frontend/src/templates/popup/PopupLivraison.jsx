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

const itemLocations = {
  'Vis ABCD': [3, 0],
  'Led NOPQ': [5, 1],
};

const getPosteColor = (id) => {
  if (id === "1") return '#9fc3f1'; 
  else if (id === "2") return '#b6fcce'; 
  else if (id === "3") return '#ffb6b6'; 
  else if (id === "4") return '#FFC481'; 
  else if (id === "5") return '#FFFD8E'; 
  else if (id === "6") return '#B6A9FF'; 
  else if (id === "7") return '#ffb1e5'; 
  else return '#5e5e5eff'
};

export default function PopupLivraison({ open, onClose, posteId, tasks, onDeliver, posteColor }) {
  
  const [clickedTasks, setClickedTasks] = useState(new Set());
  const color = posteColor || getPosteColor(posteId);

  useEffect(() => {
    if (open) {
      setClickedTasks(new Set());
    }
  }, [open]);

  const tasksForPoste = tasks.filter(
    (task) => task.posteId === posteId && task.status === 'pending'
  )

  // --- 1. Gestion des Multiples : Récupérer toutes les tâches d'une case ---
  const getTasksAt = (r, c) => {
    return tasksForPoste.filter(task => {
      const location = itemLocations[task.item];
      return location && location[0] === r && location[1] === c;
    });
  };

  // --- Gestion du clic groupé ---
  const handleCellClick = (cellTasks) => {
    if (!cellTasks || cellTasks.length === 0) return;

    setClickedTasks(prevClickedTasks => {
      const newSet = new Set(prevClickedTasks);
      const allSelected = cellTasks.every(t => newSet.has(t.id));

      if (allSelected) {
        // Tout désélectionner
        cellTasks.forEach(t => newSet.delete(t.id));
      } else {
        // Tout sélectionner
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
      
      // La case est validée si TOUTES ses tâches sont cochées
      const isFullyChecked = hasTask && cellTasks.every(t => clickedTasks.has(t.id));
      
      // Nom de l'item (identique pour toutes les tâches de la case)
      const itemName = hasTask ? cellTasks[0].item : '';

      gridCells.push(
        <Box
          key={`${r}-${c}`}
          className="grid-cell"
          onClick={() => handleCellClick(cellTasks)}
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
          {/* Badge pour les multiples (ex: x2) */}
          {hasTask && cellTasks.length > 1 && (
            <Box sx={{
              position: 'absolute',
              top: 5,
              right: 5,
              backgroundColor: 'red',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8rem',
              boxShadow: 2,
              zIndex: 10
            }}>
              x{cellTasks.length}
            </Box>
          )}

          {itemName}
          
          {isFullyChecked && (
            <CheckCircleIcon sx={{
              position: 'absolute',
              color: 'white',
              fontSize: '2.5rem',
              pointerEvents: 'none', 
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

  const allTasksClicked = tasksForPoste.length > 0 && clickedTasks.size === tasksForPoste.length;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr 2fr',
          gap: '20px',
          width: '100vw',
          height: '100vh',
          padding: '24px',
          boxSizing: 'border-box',
          backgroundColor: '#f0f0f0',
        }}
      >
        {/* GRILLE */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gap: '1px',
            border: '3px solid #666',
            backgroundColor: '#666',
          }}
        >
          {gridCells}
        </Box>

        {/* BOUTONS */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '40px 0',
          }}
        >
          <Button 
            variant="contained" 
            onClick={onClose}
            sx={{ padding: '25px', fontSize: '1.5rem', backgroundColor: '#d9d9d9', color: 'black' }}
          >
            Retour
          </Button>
          
          <Button 
            variant="contained" 
            onClick={handleValidate}
            disabled={!allTasksClicked} 
            sx={{ 
              padding: '25px', 
              fontSize: '1.5rem', 
              backgroundColor: '#d9d9d9', 
              color: 'black',
              opacity: !allTasksClicked ? 0.5 : 1.0, 
            }}
          >
            Valider
          </Button>
        </Box>

        {/* --- 2. Colonne de droite avec SCROLL --- */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#d9d9d9',
            border: '2px solid #aaa',
            padding: '20px',
            height: '100%',      // Prend toute la hauteur de la colonne
            boxSizing: 'border-box',
            overflow: 'hidden'   // Empêche le conteneur gris de scroller
          }}
        >
          <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold' }}>
            Commandes :
          </Typography>
          <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
            Poste {posteId}
          </Typography>
          
          {/* Liste défilante */}
          <Box
            sx={{
              backgroundColor: color,
              color: 'white',
              borderRadius: '8px',
              padding: '15px 20px',
              flexGrow: 1,         // Force la liste à prendre l'espace restant
              overflowY: 'auto',   // Active le scroll vertical
              minHeight: 0         // Important pour le scroll flexbox
            }}
          >
            {tasksForPoste.length > 0 ? (
              <List>
                {tasksForPoste.map((task) => (
                  <ListItem key={task.id} sx={{ padding: '0 0 10px 0' }}>
                    <ListItemText 
                      primary={
                        (clickedTasks.has(task.id) ? '✅ ' : '• ') + 
                        `Récupérer ${task.item}`
                      }
                      primaryTypographyProps={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 'bold',
                        textDecoration: clickedTasks.has(task.id) ? 'line-through' : 'none',
                        opacity: clickedTasks.has(task.id) ? 0.7 : 1.0,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>
                Aucune tâche en attente.
              </Typography>
            )}
          </Box>
        </Box>

      </Box>
    </Dialog>
  )
}