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
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'

import '../../styles/Base.css'
import PopupLivraison from '../templates/popup/PopupLivraison'

// --- CONSTANTES DE CONFIGURATION ---

// Le cycle de déplacement fixe du train, dans l'ordre
const CYCLE_PATH = ['1', '2', '3', '7', '4', '5', '6'];

// Noms lisibles pour les ID
const POSTE_NAMES = {
  '1': 'Poste 1',
  '2': 'Poste 2',
  '3': 'Poste 3',
  '4': 'Presse Injection',
  '5': 'Machine X',
  '6': 'Machine Y',
  '7': 'Fournisseur',
};

// Map des positions du train pour chaque destination
const TRAIN_POSITIONS = {
  'null': { gridRow: 3, gridColumn: 1 }, // Position "Home" / Début de cycle
  '1': { gridRow: 3, gridColumn: 2 }, // Devant Poste 1
  '2': { gridRow: 3, gridColumn: 4 }, // Devant Poste 2
  '3': { gridRow: 3, gridColumn: 6 }, // Devant Poste 3
  '7': { gridRow: 2, gridColumn: 2 }, // Sous Fournisseur
  '4': { gridRow: 2, gridColumn: 4 }, // Sous Presse
  '5': { gridRow: 2, gridColumn: 6 }, // Sous Machine X
  '6': { gridRow: 2, gridColumn: 8 }, // Sous Machine Y
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
    // Si le poste actuel a encore des tâches, le train ne bouge pas.
    // La destination RESTE ce poste.
    if (hasPendingTasksAtCurrent) {
      return currentPosteId;
    }
  }

  // Si le train est 'null' (au début) OU si le poste actuel est terminé,
  // on cherche le *prochain* arrêt dans le cycle.
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
export default function Base() {
  const [tasks, setTasks] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [selectedPosteId, setSelectedPosteId] = useState(null)

  // Suit la position ACTUELLE du train. 'null' au démarrage.
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

  // --- Logique de Destination et Position (calculée) ---
  
  // Détermine la PROCHAINE destination (pour la surbrillance)
  const nextDestination = useMemo(
    () => findNextDestination(tasks, currentTrainPoste), 
    [tasks, currentTrainPoste] // Recalcule si les tâches ou la position du train changent
  );
  
  // Détermine la position de l'ICÔNE du train (basée sur son état actuel)
  const trainGridPosition = useMemo(
    () => TRAIN_POSITIONS[currentTrainPoste] || TRAIN_POSITIONS['null'], 
    [currentTrainPoste] // Recalcule seulement si le train bouge
  );
  
  // Calcule les groupes de tâches pour la sidebar
  const taskGroups = useMemo(() => groupTasks(tasks), [tasks]);

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
    // La popup ne s'ouvre que si on clique sur la bonne destination
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
    // 'tasks' est mis à jour.
    // 'nextDestination' sera automatiquement recalculé par le useMemo.
  }

  // --- Fonction de simulation ---
  const simulerTache = (posteId, item) => {
    // Si on ne fournit pas un 'item' spécifique, on crée un item
    // de test générique (pour les postes 1, 2, 4...)
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
      minHeight: '100vh', 
      bgcolor: 'grey.100',
      p: 3 
    }}>
      <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        
        {/* Colonne de Gauche: Le Plan */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={2} sx={{ 
            flexGrow: 1, 
            p: 3,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h4" gutterBottom>Plan</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button variant="contained" color="error">Stop</Button>
              
              {/*Boutons de simulation pour la maquette */}
              <Button 
                variant="outlined" 
                color="info" 
                size="small" 
                onClick={() => simulerTache('3', 'Vis ABCD')}
              >
                Sim (P3 - Vis ABCD)
              </Button>
              <Button 
                variant="outlined" 
                color="info" 
                size="small" 
                onClick={() => simulerTache('3', 'Led NOPQ')}
              >
                Sim (P3 - Led NOPQ)
              </Button>

              <Button 
                variant="outlined" 
                color="info" 
                size="small" 
                onClick={() => simulerTache('1', 'Vis ABCD')}
              >
                Sim (P1 - Vis ABCD)
              </Button>
              <Button 
                variant="outlined" 
                color="info" 
                size="small" 
                onClick={() => simulerTache('2', 'Led NOPQ')}
              >
                Sim (P2 - Led NOPQ)
              </Button>
            </Box>
            
            {/* Grille 8x3 */}
            <Box
              className="plan-grid"
              sx={{
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
              <Typography 
                variant="h4" 
                className="train" 
                sx={{
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
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Paper elevation={2} sx={{ 
            flexGrow: 1, 
            p: 2,
            display: 'flex',
            flexDirection: 'column' 
          }}>
            <Typography variant="h5" gutterBottom>À suivre</Typography>
            
            {/* Rendu dynamique des tâches */}
            {Object.keys(POSTE_NAMES).map(posteId => {
              const posteName = POSTE_NAMES[posteId];
              const tasksForPoste = taskGroups[posteName];
              
              if (tasksForPoste && tasksForPoste.length > 0) {
                return (
                  <Paper elevation={1} sx={{ p: 2, mb: 2 }} key={posteId}>
                    <Typography variant="h6">{posteName}</Typography>
                    <List dense>
                      {tasksForPoste.map(task => (
                        <ListItem key={task.id}>
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

            {/* Statut WebSocket en bas */}
            <Box sx={{ mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography sx={{ display: 'flex', alignItems: 'center' }}>
                WebSocket: 
                {connected 
                  ? <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                  : <ErrorIcon color="error" sx={{ ml: 1 }} />
                }
                <Box 
                  component="span" 
                  sx={{ ml: 0.5, color: connected ? 'success.main' : 'error.main', fontWeight: 'bold' }}
                >
                  {connected ? 'connecté' : 'déconnecté'}
                </Box>
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Rendu de la Popup (Dialog) */}
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