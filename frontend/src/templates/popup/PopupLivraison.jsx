/**
 * Interface de validation de livraison modernisée.
 * Structure : Grille d'étagère (Gauche) | Liste de contrôle et Actions (Droite)
 */
import React, { useState, useEffect } from 'react'
import {
  Dialog,
  List,
  ListItem,
  ListItemText,
  Button,
  Box,
  Typography,
  CircularProgress,
  Paper
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Identifiants des stands considérés comme des Magasins (Pick-up)
const STORE_IDS = ['4', '5', '6', '7'];

export default function PopupLivraison({ open, onClose, posteId, posteName, tasks, onDeliver, onMissing }) {
  const [clickedTasks, setClickedTasks] = useState(new Set());
  const [shelfLayout, setShelfLayout] = useState(null);
  const [loading, setLoading] = useState(true);

  const isMagasin = STORE_IDS.includes(String(posteId));
  const accentColor = '#0052CC'; // Bleu professionnel (Atlassian style)

  // Chargement dynamique du layout JSON
  useEffect(() => {
    if (open && posteId) {
      setLoading(true);
      setClickedTasks(new Set());
      
      // Utilisation des BACKTICKS pour l'interpolation de posteId
      fetch(`/etagere_${posteId}.json`)
        .then(res => {
          if (!res.ok) throw new Error(`Fichier etagere_${posteId}.json introuvable (404)`);
          return res.json();
        })
        .then(data => {
          setShelfLayout(data);
          setLoading(false);
        })
        .catch(err => {
          // Si le JSON n'est pas trouvé, on log l'erreur sans faire planter l'app
          console.error("Erreur de structure de grille :", err.message);
          setShelfLayout(null); 
          setLoading(false);
        });
    }
  }, [open, posteId]);

  /**
   * Compare le code-barre de la case avec les tâches en attente.
   * Nettoyage des espaces et casse pour une correspondance parfaite.
   */
  const getTasksForValue = (val) => {
    if (!val || !tasks) return [];
    return tasks.filter(task => {
      // On compare les chaînes brutes comme dans votre version initiale
      const taskBarre = String(task.code_barre || "").trim();
      const shelfVal = String(val || "").trim();
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
      } catch (err) { console.error("Erreur signalement manquant:", err); }
    }
    onClose();
  };

  const allTasksClicked = tasks.length > 0 && clickedTasks.size === tasks.length;
  const anyTaskClicked = clickedTasks.size > 0;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullScreen
      PaperProps={{ sx: { bgcolor: '#F4F5F7', fontFamily: "'Inter', sans-serif" } }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 400px', width: '100vw', height: '100vh' }}>
        
        {/* --- ZONE GAUCHE : L'ÉTAGÈRE (Blueprint) --- */}
        <Box sx={{ 
          p: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          bgcolor: 'white', borderRight: '1px solid #DFE1E6' 
        }}>
          <Box sx={{
            display: 'grid',
            gridTemplateRows: shelfLayout?.layout?.templateRows || 'repeat(8, 1fr)',
            gridTemplateColumns: shelfLayout?.layout?.templateColumns || 'repeat(2, 1fr)',
            gap: '12px', width: '100%', height: '100%', maxWidth: '800px', maxHeight: '800px',
            p: 3, bgcolor: '#EBECF0', borderRadius: '12px', border: '1px solid #DFE1E6', position: 'relative'
          }}>
            {loading ? (
              <CircularProgress sx={{ position: 'absolute', top: '50%', left: '50%', color: accentColor }} />
            ) : shelfLayout ? (
              shelfLayout.items.map((item) => {
                const cellTasks = getTasksForValue(item.val);
                const hasTask = cellTasks.length > 0;
                const isChecked = hasTask && cellTasks.every(t => clickedTasks.has(t.id));

                return (
                  <Paper
                    key={item.id}
                    elevation={0}
                    onClick={() => hasTask && handleCellClick(cellTasks)}
                    sx={{
                      ...item.style,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isChecked ? '#E3F2FD' : (hasTask ? 'white' : '#F4F5F7'),
                      color: isChecked ? accentColor : '#172B4D',
                      border: '2px solid',
                      borderColor: isChecked ? accentColor : (hasTask ? '#DFE1E6' : 'transparent'),
                      borderRadius: '8px', cursor: hasTask ? 'pointer' : 'default',
                      position: 'relative', transition: 'all 0.1s ease',
                      '&:hover': { 
                        borderColor: hasTask ? accentColor : 'transparent', 
                        transform: hasTask ? 'translateY(-2px)' : 'none' 
                      }
                    }}
                  >
                    {hasTask && (
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', textAlign: 'center', px: 1 }}>
                        {cellTasks[0].item}
                      </Typography>
                    )}
                    {isChecked && <CheckCircleIcon sx={{ position: 'absolute', color: accentColor, fontSize: '2.5rem', opacity: 0.8 }} />}
                  </Paper>
                );
              })
            ) : (
                <Typography sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#5E6C84' }}>
                    Aucune configuration d'étagère trouvée.
                </Typography>
            )}
          </Box>
        </Box>

        {/* --- ZONE DROITE : ACTIONS ET LISTE (Sidebar) --- */}
        <Box sx={{ display: 'flex', flexDirection: 'column', p: 4, bgcolor: '#F4F5F7' }}>
          <Box sx={{ mb: 4 }}>
            <Typography variant="overline" sx={{ color: '#5E6C84', fontWeight: 800, letterSpacing: '1px' }}>
                {isMagasin ? 'RÉCUPÉRATION MAGASIN' : 'DÉPÔT POSTE'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#172B4D' }}>
                {posteName || `Poste ${posteId}`}
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 3 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#42526E', mb: 2, textTransform: 'uppercase' }}>
              Checklist ({tasks.length})
            </Typography>
            {tasks.map((task) => {
              const done = clickedTasks.has(task.id);
              return (
                <Paper key={task.id} elevation={0} sx={{ 
                  p: 2, mb: 1.5, borderRadius: '8px', border: '1px solid',
                  borderColor: done ? '#4CAF50' : '#DFE1E6',
                  bgcolor: done ? '#E8F5E9' : 'white'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircleIcon sx={{ color: done ? '#4CAF50' : '#DFE1E6' }} />
                    <Typography sx={{ 
                        fontWeight: 600, 
                        textDecoration: done ? 'line-through' : 'none', 
                        color: done ? '#2E7D32' : '#172B4D' 
                    }}>
                      {isMagasin ? 'Récupérer' : 'Déposer'} {task.item}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
            {tasks.length === 0 && <Typography sx={{ fontStyle: 'italic', color: '#5E6C84' }}>Aucune pièce à traiter ici.</Typography>}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 3, borderTop: '2px solid #DFE1E6' }}>
            <Button 
              variant="contained" 
              fullWidth 
              size="large"
              onClick={handleValidate} 
              disabled={!allTasksClicked}
              sx={{ 
                bgcolor: accentColor, 
                fontWeight: 700, 
                py: 2, 
                textTransform: 'none', 
                fontSize: '1.1rem',
                '&:hover': { bgcolor: '#0747A6' }
              }}
            >
              Valider l'étape
            </Button>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isMagasin && (
                <Button 
                    variant="outlined" 
                    color="error" 
                    fullWidth 
                    onClick={handleMissing} 
                    disabled={!anyTaskClicked} 
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Manquant
                </Button>
              )}
              <Button 
                variant="text" 
                fullWidth 
                onClick={onClose} 
                sx={{ color: '#42526E', fontWeight: 600, textTransform: 'none' }}
              >
                Annuler
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}