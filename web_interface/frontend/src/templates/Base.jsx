import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton //
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import DeleteIcon from '@mui/icons-material/Delete' // Import de l'icône poubelle

import '../../styles/Base.css' //
import PopupLivraison from '../templates/popup/PopupLivraison' //

// --- CONSTANTES DE CONFIGURATION ---

const CYCLE_PATH = ['1', '2', '3', '7', '4', '5', '6'];

const POSTE_NAMES = {
  '1': 'Poste 1',
  '2': 'Poste 2',
  '3': 'Poste 3',
  '4': 'Presse Injection',
  '5': 'Machine X',
  '6': 'Machine Y',
  '7': 'Fournisseur',
};

const TRAIN_POSITIONS = {
  'null': { gridRow: 3, gridColumn: 1 },
  '1': { gridRow: 3, gridColumn: 2 },
  '2': { gridRow: 3, gridColumn: 4 },
  '3': { gridRow: 3, gridColumn: 6 },
  '7': { gridRow: 2, gridColumn: 2 },
  '4': { gridRow: 2, gridColumn: 4 },
  '5': { gridRow: 2, gridColumn: 6 },
  '6': { gridRow: 2, gridColumn: 8 },
};

// --- tâches (Sidebar) ---
const groupTasks = (tasks) => {
  const groups = Object.keys(POSTE_NAMES).reduce((acc, posteId) => {
    acc[POSTE_NAMES[posteId]] = [];
    return acc;
  }, {});

  tasks.filter(t => t.status === 'pending').forEach(task => {
    const posteName = POSTE_NAMES[task.posteId];
    if (posteName) {
      groups[posteName].push(task);
    }
  });
  return groups;
}

// --- PROCHAINE destination ---
const findNextDestination = (tasks, currentPosteId) => {
  if (currentPosteId) {
    const hasPendingTasksAtCurrent = tasks.some(
      t => t.posteId === currentPosteId && t.status === 'pending'
    );
    if (hasPendingTasksAtCurrent) {
      return currentPosteId;
    }
  }

  const currentIndex = currentPosteId ? CYCLE_PATH.indexOf(currentPosteId) : -1;

  for (let i = 1; i <= CYCLE_PATH.length; i++) {
    const checkIndex = (currentIndex + i) % CYCLE_PATH.length;
    const posteToTest = CYCLE_PATH[checkIndex];

    const hasPendingTask = tasks.some(
      t => t.posteId === posteToTest && t.status === 'pending'
    );
    
    if (hasPendingTask) {
      return posteToTest;
    }
  }

  return null;
}


// --- Composant principal ---
export default function Base({onApp}) {
  const [tasks, setTasks] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedPosteId, setSelectedPosteId] = useState(null)
  const [currentTrainPoste, setCurrentTrainPoste] = useState(null);

  // --- Connexion WebSocket ---
  useEffect(() => {
    const url = (location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.hostname + ':8000/ws/scans'
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.addEventListener('open', () => setConnected(true))
    ws.addEventListener('close', () => setConnected(false))

    // Réception du message du backend
    ws.addEventListener('message', (ev) => {
      try {
        // 1. On décode le JSON envoyé par main.py
        const data = JSON.parse(ev.data)
        
        // 2. On récupère les infos utiles
        const device = String(data.poste) // ex: "1"
        const barcode = data.code_barre   // ex: "Vis ABCD"

        // 3. Si le poste est connu, on ajoute la tâche
        if (POSTE_NAMES[device]) {
          const newTask = {
            id: Date.now(),
            posteId: device, 
            action: 'Récupérer', 
            item: barcode, 
            origin: 'Scan', 
            status: 'pending',
            ts: new Date().toLocaleString()
          }
          
          // Mise à jour de l'état React pour afficher la tâche
          setTasks((currentTasks) => [newTask, ...currentTasks].slice(0, 100))
          console.log(`[Front] Scan reçu : ${barcode} pour ${device}`)
        } else {
          console.warn(`Scan reçu d'un poste inconnu : ${device}`)
        }

      } catch (err) {
        console.error("Erreur de lecture du message WebSocket :", err)
      }
    })

    return () => ws.close()
  }, [])

  // --- Logique de Destination et Position ---
  const nextDestination = useMemo(
    () => findNextDestination(tasks, currentTrainPoste), 
    [tasks, currentTrainPoste]
  );
  
  const trainGridPosition = useMemo(
    () => TRAIN_POSITIONS[currentTrainPoste] || TRAIN_POSITIONS['null'], 
    [currentTrainPoste]
  );
  
  const taskGroups = useMemo(() => groupTasks(tasks), [tasks]);

  // --- Gestion de la suppression de tâche ---
  const handleDeleteTask = (taskId) => {
    setTasks(currentTasks => currentTasks.filter(t => t.id !== taskId));
  }

  // --- style pour les boîtes ---
  const getBoxSx = (posteId) => {
    const isActive = nextDestination === posteId; 
    
    return {
      p: 2,
      textAlign: 'center',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      border: '2px solid',
      borderColor: isActive ? 'primary.main' : 'transparent',
      transform: isActive ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isActive ? 6 : 3,
      transition: 'all 0.2s ease-in-out',
      '&:hover': { boxShadow: 6 }
    };
  }

  // --- Gestion de la Popup ---
  const handlePosteClick = (posteId) => {
    if (posteId !== nextDestination) {
      console.warn(`Action bloquée: Prochaine destination est ${nextDestination}.`);
      return;
    }
    setCurrentTrainPoste(posteId); 
    setSelectedPosteId(posteId)
    setIsPopupOpen(true)
  }
  
  const closePopup = () => setIsPopupOpen(false)
  
  const handleDeliverTask = (taskId) => {
    setTasks(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId ? { ...task, status: 'delivered' } : task
      )
    )
  }

  // --- Fonction de simulation ---
  const simulerTache = (posteId, item) => {
    const itemFinal = item || `TEST_POUR_${POSTE_NAMES[posteId]}`;
    
    const MOCK_TASK = {
      id: Date.now(),
      posteId: posteId,
      action: 'Déposer', 
      item: itemFinal,
      origin: 'Simulation',
      status: 'pending',
      ts: new Date().toLocaleString()
    };
    setTasks((currentTasks) => [MOCK_TASK, ...currentTasks]);
  }

  // --- Rendu JSX ---
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', // Fixer la hauteur totale à l'écran pour le scroll
      bgcolor: 'grey.100',
      p: 3,
      overflow: 'hidden' // Empêche le scroll global
    }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        
        {/* Colonne de Gauche: Le Plan */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper elevation={2} sx={{ 
            flexGrow: 1, 
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto' // Scroll interne si le plan est trop grand
          }}>
            <Typography variant="h4" gutterBottom>Plan</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button variant="contained" color="error" onClick={onApp}>Stop</Button>
              <Button variant="outlined" color="info" size="small" onClick={() => simulerTache('3', 'Vis ABCD')}>Sim (P3 - Vis)</Button>
              <Button variant="outlined" color="info" size="small" onClick={() => simulerTache('3', 'Led NOPQ')}>Sim (P3 - Led)</Button>
              <Button variant="outlined" color="info" size="small" onClick={() => simulerTache('1', 'Vis ABCD')}>Sim (P1 - Vis)</Button>
              <Button variant="outlined" color="info" size="small" onClick={() => simulerTache('2', 'Led NOPQ')}>Sim (P2 - Led)</Button>
            </Box>
            
            {/* Grille 8x3 */}
            <Box className="plan-grid" sx={{
                flexGrow: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(8, 1fr)',
                gridTemplateRows: 'repeat(3, 1fr)',
                gap: '10px',
                alignItems: 'center',      
                justifyItems: 'stretch', 
              }}
            >
              {/* --- Ligne 1 (Magasins) --- */}
              <Paper id="fournisseur" sx={{ ...getBoxSx('7'), gridArea: '1 / 2' }} onClick={() => handlePosteClick('7')}>{POSTE_NAMES['7']}</Paper>
              <Typography className="arrow" sx={{ gridArea: '1 / 3', textAlign: 'center' }}>→</Typography>
              <Paper id="presse" sx={{ ...getBoxSx('4'), gridArea: '1 / 4' }} onClick={() => handlePosteClick('4')}>{POSTE_NAMES['4']}</Paper>
              <Typography className="arrow" sx={{ gridArea: '1 / 5', textAlign: 'center' }}>→</Typography>
              <Paper id="machine-x" sx={{ ...getBoxSx('5'), gridArea: '1 / 6' }} onClick={() => handlePosteClick('5')}>{POSTE_NAMES['5']}</Paper>
              <Typography className="arrow" sx={{ gridArea: '1 / 7', textAlign: 'center' }}>→</Typography>
              <Paper id="machine-y" sx={{ ...getBoxSx('6'), gridArea: '1 / 8' }} onClick={() => handlePosteClick('6')}>{POSTE_NAMES['6']}</Paper>

              {/* --- Ligne 2 (Train) --- */}
              <Typography variant="h4" className="train" sx={{
                  gridRow: trainGridPosition.gridRow,
                  gridColumn: trainGridPosition.gridColumn,
                  transition: 'all 0.5s ease-in-out',
                  textAlign: 'center',
                  m: 'auto'
                }}
              >
                🚂
              </Typography>

              {/* --- Ligne 3 (Postes) --- */}
              <Typography className="arrow" sx={{ gridArea: '3 / 2', textAlign: 'center' }}>→</Typography>
              <Paper id="poste-1" sx={{ ...getBoxSx('1'), gridArea: '3 / 3' }} onClick={() => handlePosteClick('1')}>{POSTE_NAMES['1']}</Paper>
              <Typography className="arrow" sx={{ gridArea: '3 / 4', textAlign: 'center' }}>→</Typography>
              <Paper id="poste-2" sx={{ ...getBoxSx('2'), gridArea: '3 / 5' }} onClick={() => handlePosteClick('2')}>{POSTE_NAMES['2']}</Paper>
              <Typography className="arrow" sx={{ gridArea: '3 / 6', textAlign: 'center' }}>→</Typography>
              <Paper id="poste-3" sx={{ ...getBoxSx('3'), gridArea: '3 / 7' }} onClick={() => handlePosteClick('3')}>{POSTE_NAMES['3']}</Paper>
            </Box>
          </Paper>
        </Grid>
        
        {/* Colonne de Droite: La Sidebar */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper elevation={2} sx={{ 
            flexGrow: 1, 
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            height: '100%' // Assure que le Paper prend toute la hauteur dispo
          }}>
            <Typography variant="h5" gutterBottom>À suivre</Typography>
            
            {/* ZONE DE SCROLL POUR LES TÂCHES */}
            <Box sx={{ 
              flexGrow: 1, 
              overflowY: 'auto', // Active le scroll vertical
              mb: 2,
              pr: 1 // Petite marge pour la scrollbar
            }}>
              {Object.keys(POSTE_NAMES).map(posteId => {
                const posteName = POSTE_NAMES[posteId];
                const tasksForPoste = taskGroups[posteName];
                
                if (tasksForPoste && tasksForPoste.length > 0) {
                  return (
                    <Paper elevation={1} sx={{ p: 2, mb: 2 }} key={posteId}>
                      <Typography variant="h6">{posteName}</Typography>
                      <List dense>
                        {tasksForPoste.map(task => (
                          <ListItem 
                            key={task.id}
                            secondaryAction={
                              <IconButton 
                                edge="end" 
                                aria-label="delete" 
                                onClick={() => handleDeleteTask(task.id)}
                                color="error"
                                size="small"
                              >
                                <DeleteIcon />
                              </IconButton>
                            }
                          >
                            <ListItemText primary={`${task.action} ${task.item}`} />
                          </ListItem>
                        ))}
                      </List>
                    </Paper>
                  );
                }
                return null;
              })}

              {tasks.filter(t => t.status === 'pending').length === 0 && (
                <Typography sx={{ p: 2, color: 'text.secondary' }}>
                  Aucune tâche en attente.
                </Typography>
              )}
            </Box>

            {/* Statut WebSocket en bas (Reste fixe) */}
            <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                WebSocket: 
                {connected 
                  ? <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                  : <ErrorIcon color="error" sx={{ ml: 1 }} />
                }
                <Box component="span" sx={{ ml: 0.5, color: connected ? 'success.main' : 'error.main', fontWeight: 'bold' }}>
                  {connected ? 'connecté' : 'déconnecté'}
                </Box>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <PopupLivraison
        open={isPopupOpen}
        onClose={closePopup}
        posteId={selectedPosteId}
        posteName={POSTE_NAMES[selectedPosteId] || ''} 
        tasks={tasks} 
        onDeliver={handleDeliverTask}
      />
    </Box>
  )
}