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
  IconButton,
  Chip
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
  // On ignore les tâches terminées
  const activeTasks = tasks.filter(t => t.status !== 'finished');

  const groups = Object.keys(POSTE_NAMES).reduce((acc, id) => {
    acc[POSTE_NAMES[id]] = [];
    return acc;
  }, {});

  activeTasks.forEach(task => {
    // Si statut = À RECUPERER -> On affiche sous le MAGASIN
    if (task.status === 'to_collect' && POSTE_NAMES[task.magasinId]) {
      groups[POSTE_NAMES[task.magasinId]].push(task);
    }
    // Si statut = À DEPOSER -> On affiche sous le POSTE
    else if (task.status === 'to_deposit' && POSTE_NAMES[task.posteId]) {
      groups[POSTE_NAMES[task.posteId]].push(task);
    }
  });
  return groups;
}

// --- PROCHAINE destination ---
const findNextDestination = (tasks, currentTrainLocation) => {
  const activeTasks = tasks.filter(t => t.status !== 'finished');

  // 1. Priorité : Travail à faire là où on est déjà ?
  if (currentTrainLocation) {
    const hasWorkHere = activeTasks.some(t => {
      // Je suis au magasin et je dois charger ?
      if (t.status === 'to_collect' && t.magasinId === currentTrainLocation) return true;
      // Je suis au poste et je dois décharger ?
      if (t.status === 'to_deposit' && t.posteId === currentTrainLocation) return true;
      return false;
    });
    if (hasWorkHere) return currentTrainLocation;
  }

  // 2. Recherche du prochain arrêt dans le cycle
  const currentIndex = currentTrainLocation ? CYCLE_PATH.indexOf(currentTrainLocation) : -1;

  for (let i = 1; i <= CYCLE_PATH.length; i++) {
    const checkIndex = (currentIndex + i) % CYCLE_PATH.length;
    const locationToCheck = CYCLE_PATH[checkIndex];

    const needsStop = activeTasks.some(t => {
      if (t.status === 'to_collect' && t.magasinId === locationToCheck) return true;
      if (t.status === 'to_deposit' && t.posteId === locationToCheck) return true;
      return false;
    });

    if (needsStop) return locationToCheck;
  }

  return null;
}


// --- Composant principal ---
export default function Base() {
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
        const data = JSON.parse(ev.data)
        const device = String(data.poste)
        const barcode = data.code_barre
        // On récupère l'ID du magasin envoyé par le back, ou '7' par défaut
        const magasin = data.magasin_id ? String(data.magasin_id) : '7' 

        if (POSTE_NAMES[device]) {
          const newTask = {
            id: Date.now(),
            posteId: device,      // Destination finale
            magasinId: magasin,   // Source (Magasin)
            item: barcode,
            origin: 'Scan',
            status: 'to_collect', // <--- NOUVEAU STATUT DE DEPART
            ts: new Date().toLocaleString()
          }
          setTasks((prev) => [newTask, ...prev].slice(0, 100))
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
  
  const handleTaskAction = (taskId) => {
    setTasks(currentTasks => currentTasks.map(task => {
      if (task.id !== taskId) return task;

      // Logique d'avancement : Récupérer -> Déposer -> Fini
      if (task.status === 'to_collect') {
        return { ...task, status: 'to_deposit' }; 
      } else if (task.status === 'to_deposit') {
        return { ...task, status: 'finished' };   
      }
      return task;
    }));
  }

  // --- Fonction de simulation ---
  const simulerTache = (posteId, magasinId, item) => {
    const newTask = {
      id: Date.now(),
      posteId: posteId,      // Destination
      magasinId: magasinId,  // Origine (Nouveau !)
      item: item,
      origin: 'Sim',
      status: 'to_collect',  // Statut correct pour la sidebar
      ts: new Date().toLocaleString()
    };
    setTasks(prev => [newTask, ...prev]);
  }

  const tasksForPopup = tasks.filter(t => {
    // 1. On cache toujours les tâches terminées
    if (t.status === 'finished') return false;

    // 2. Si la popup est ouverte sur un MAGASIN (ex: '7')
    // On ne veut voir que les tâches qui partent de CE magasin et qui sont "À récupérer"
    if (selectedPosteId === t.magasinId && t.status === 'to_collect') {
      return true;
    }

    // 3. Si la popup est ouverte sur un POSTE (ex: '1')
    // On ne veut voir que les tâches qui vont vers CE poste et qui sont "À déposer"
    if (selectedPosteId === t.posteId && t.status === 'to_deposit') {
      return true;
    }

    // Sinon, on cache la tâche
    return false;
  });

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
              <Button variant="contained" color="error">Stop</Button>
              
              {/* Boutons mis à jour avec : Poste, Magasin, Nom de l'objet */}
              <Button 
                variant="outlined" color="info" size="small" 
                onClick={() => simulerTache('1', '5', 'Vis A (Mag 5 -> P1)')}
              >
                Sim (M5 - P1)
              </Button>
              
              <Button 
                variant="outlined" color="info" size="small" 
                onClick={() => simulerTache('2', '4', 'Plastique (M4 -> P2)')}
              >
                Sim (M4 - P2)
              </Button>

              <Button 
                 variant="outlined" color="info" size="small" 
                 onClick={() => simulerTache('3', '7', 'Colis (Fourn -> P3)')}
              >
                Sim (F - P3)
              </Button>
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
                              onClick={() => handleDeleteTask(task.id)} 
                              color="error" 
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText 
                            primary={task.item}
                            secondary={task.status === 'to_collect' ? 
                              `Aller chercher au ${POSTE_NAMES[task.magasinId]}` : 
                              `Apporter au ${POSTE_NAMES[task.posteId]}`
                            }
                          />
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
        tasks={tasksForPopup} 
        onDeliver={handleTaskAction}
      />
    </Box>
  )
}