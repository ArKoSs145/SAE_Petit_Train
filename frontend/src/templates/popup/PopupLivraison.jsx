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
const apiUrl = import.meta.env.VITE_API_URL;


const getPosteColor = (id) => {
  const colors = {
    "1": '#9fc3f1', "2": '#b6fcce', "3": '#ffb6b6', 
    "4": '#FFC481', "5": '#e7e42bff', "6": '#B6A9FF', "7": '#ffb1e5'
  };
  return colors[id] || '#5e5e5eff';
};

const STORE_IDS = ['4', '5', '6', '7'];

export default function PopupLivraison({ open, onClose, posteId, tasks, onDeliver, onMissing }) {
  const [clickedTasks, setClickedTasks] = useState(new Set());
  const [shelfLayout, setShelfLayout] = useState(null);
  const [loading, setLoading] = useState(true);

  const color = getPosteColor(posteId);
  const isMagasin = STORE_IDS.includes(String(posteId));

  useEffect(() => {
    if (open && posteId) {
      setLoading(true);
      setClickedTasks(new Set());
      
      fetch(`/etagere_${posteId}.json`)
        .then(res => res.json())
        .then(data => {
          setShelfLayout(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Erreur layout:", err);
          setShelfLayout(null);
          setLoading(false);
        });
    }
  }, [open, posteId]);

  // FONCTION DE CORRESPONDANCE PAR CODE-BARRE
  // Dans PopupLivraison.jsx, modifiez getTasksForValue ainsi :
  const getTasksForValue = (val) => {
    if (!val || !tasks) return [];
    
    return tasks.filter(task => {
      const taskBarre = String(task.code_barre || "").trim();
      const shelfVal = String(val || "").trim();
      
      // LOG DE DEBUG : À supprimer une fois le problème identifié
      if (shelfVal === taskBarre) {
        console.log("Match trouvé !", { shelfVal, taskBarre });
      }

      return taskBarre === shelfVal;
    });
  };

  const handleCellClick = (cellTasks) => {
    if (!cellTasks || cellTasks.length === 0) return;
    setClickedTasks(prev => {
      const newSet = new Set(prev);
      const allSelected = cellTasks.every(t => newSet.has(t.id));
      if (allSelected) cellTasks.forEach(t => newSet.delete(t.id));
      else cellTasks.forEach(t => newSet.add(t.id));
      return newSet;
    });
  };

  const handleValidate = () => {
    clickedTasks.forEach(taskId => onDeliver(taskId));
    onClose();
  };

  const handleMissing = async () => {
    for (let taskId of clickedTasks) {
      try {
        await fetch(`${apiUrl}/api/commande/${taskId}/manquant`, { method: 'PUT' });
        if (onMissing) onMissing(taskId);
      } catch (err) { console.error(err); }
    }
    onClose();
  };

  const allTasksClicked = tasks.length > 0 && clickedTasks.size === tasks.length;
  const anyTaskClicked = clickedTasks.size > 0;

  return (
    <Dialog open={open} onClose={onClose} fullScreen>
      <Box sx={{
          display: 'grid', gridTemplateColumns: '3fr 1fr 2fr', gap: '20px',
          width: '100vw', height: '100vh', padding: '24px', boxSizing: 'border-box', backgroundColor: '#f0f0f0',
        }}>
        
        {/* COLONNE 1 : LA GRILLE DYNAMIQUE */}
        <Box sx={{
            display: 'grid',
            gridTemplateRows: shelfLayout?.layout?.templateRows || 'repeat(8, 1fr)',
            gridTemplateColumns: shelfLayout?.layout?.templateColumns || 'repeat(2, 1fr)',
            gap: '8px', border: '3px solid #666', backgroundColor: '#666', position: 'relative'
          }}>
          {loading ? (
            <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%', color: 'white' }} />
          ) : (
            shelfLayout?.items.map((item) => {
              // CORRECTION ICI : Utilisation de getTasksForValue(item.val)
              const cellTasks = getTasksForValue(item.val);
              const hasTask = cellTasks.length > 0;
              const isChecked = hasTask && cellTasks.every(t => clickedTasks.has(t.id));

              return (
                <Box
                  key={item.id}
                  onClick={() => hasTask && handleCellClick(cellTasks)}
                  sx={{
                    ...item.style, // Injection des spans du JSON
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    bgcolor: hasTask ? color : '#d9d9d9', color: hasTask ? 'white' : '#333',
                    border: '1px solid #444', cursor: hasTask ? 'pointer' : 'default',
                    position: 'relative', opacity: isChecked ? 0.5 : 1.0, 
                  }}
                >
                  {hasTask && (
                    <Typography variant="body1" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                      {cellTasks[0].item}
                    </Typography>
                  )}
                  {hasTask && cellTasks.length > 1 && (
                    <Box sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'red', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
                      x{cellTasks.length}
                    </Box>
                  )}
                  {isChecked && <CheckCircleIcon sx={{ position: 'absolute', color: 'white', fontSize: '3rem' }} />}
                </Box>
              );
            })
          )}
        </Box>

        {/* COLONNE 2 : LES BOUTONS */}
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 0' }}>
          <Button variant="contained" onClick={onClose} sx={{ py: 3, fontSize: '1.5rem', bgcolor: '#d9d9d9', color: 'black' }}>
            Retour
          </Button>
          {isMagasin && (
            <Button variant="contained" onClick={handleMissing} disabled={!anyTaskClicked} sx={{ py: 2, bgcolor: '#ff6b6b', color: 'white' }}>
              Produit Manquant
            </Button>
          )}
          <Button variant="contained" onClick={handleValidate} disabled={!allTasksClicked} sx={{ py: 3, fontSize: '1.5rem', bgcolor: allTasksClicked ? '#4caf50' : '#d9d9d9', color: allTasksClicked ? 'white' : 'black' }}>
            Valider
          </Button>
        </Box>

        {/* COLONNE 3 : LA LISTE */}
        <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: '#d9d9d9', border: '2px solid #aaa', p: 3, overflow: 'hidden' }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Commandes :</Typography>
          <Typography variant="h5" sx={{ mb: 2 }}>Poste {posteId}</Typography>
          <Box sx={{ bgcolor: color, color: 'white', borderRadius: 2, p: 2, flexGrow: 1, overflowY: 'auto' }}>
            {tasks.length > 0 ? (
              <List>
                {tasks.map((task) => (
                  <ListItem key={task.id} sx={{ p: 0, mb: 1 }}>
                    <ListItemText 
                      primary={(clickedTasks.has(task.id) ? '✅ ' : '• ') + `Récupérer ${task.item}`}
                      primaryTypographyProps={{ fontSize: '1.2rem', fontWeight: 'bold', textDecoration: clickedTasks.has(task.id) ? 'line-through' : 'none' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : <Typography>Aucune tâche.</Typography>}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}