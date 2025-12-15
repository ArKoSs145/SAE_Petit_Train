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
  // GARAGE (Position par défaut)
  'null': { gridRow: 5, gridColumn: 5 }, // On le met au centre (vide) pour ne pas gêner

  // CYCLE (Le train se place sur la flèche AVANT d'arriver au poste)
  
  '7':    { gridRow: 2, gridColumn: 1 }, // Flèche ↑ (Juste avant Fournisseur)
  '4':    { gridRow: 1, gridColumn: 2 }, // Flèche → (Juste avant Presse)
  '5':    { gridRow: 1, gridColumn: 4 }, // Flèche → (Juste avant Machine X)
  '6':    { gridRow: 2, gridColumn: 5 }, // Flèche ↓ (Juste avant Machine Y)
  '3':    { gridRow: 5, gridColumn: 4 }, // Flèche ← (Juste avant Poste 3)
  '2':    { gridRow: 5, gridColumn: 2 }, // Flèche ← (Juste avant Poste 2)
  '1':    { gridRow: 4, gridColumn: 1 }, // Flèche ↑ (Juste avant Poste 1)
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

// Style des boîtes (Postes / Machines)
  const getBoxSx = (posteId) => {
    const isActive = nextDestination === posteId; 
    
    return {
      // --- MODIFICATION ICI : Forme adaptative ---
      width: '100%',
      height: '100%', // Remplit toute la case de la grille
      // On retire 'aspectRatio: 1/1' pour laisser la forme devenir rectangulaire
      
      display: 'flex',
      flexDirection: 'column', // Permet d'aligner le texte verticalement si besoin
      alignItems: 'center',
      justifyContent: 'center',
      
      // Visuel
      p: 1,
      textAlign: 'center',
      cursor: 'pointer',
      border: '2px solid',
      borderColor: isActive ? 'primary.main' : 'transparent',
      transform: isActive ? 'scale(1.02)' : 'scale(1)', // Réduire légèrement l'échelle pour éviter le chevauchement
      boxShadow: isActive ? 6 : 2,
      transition: 'all 0.2s ease-in-out',
      borderRadius: 4, // Arrondir un peu plus les angles (optionnel)
      
      // Gestion du texte
      overflow: 'hidden',
      wordBreak: 'break-word',
      fontSize: 'clamp(0.9rem, 1.2vw, 1.4rem)', // Texte légèrement plus grand pour les rectangles
      fontWeight: 'bold',
      backgroundColor: 'white', // Assure un fond propre

      '&:hover': { boxShadow: 6 }
    };
  }

// Style des flèches
  const arrowSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    fontSize: '2.5rem',
    color: '#000000ff',
    userSelect: 'none',
    fontWeight: 'bold'
  };

  // Composant Flèche intelligente (se cache sous le train)
  const GridArrow = ({ row, col, symbol }) => {
    const isTrainHere = trainGridPosition.gridRow === row && trainGridPosition.gridColumn === col;
    return (
      <Typography sx={{
          ...arrowSx,
          gridRow: row,
          gridColumn: col,
          opacity: isTrainHere ? 0 : 1, // Invisible si le train est là
          transition: 'opacity 0.2s ease',
        }}>
        {symbol}
      </Typography>
    );
  };
  
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
      height: '100vh',
      width: '100vw', 
      bgcolor: 'grey.100',
      p: 1, // Une petite marge autour de l'écran (optionnel, mettre 0 si vous voulez coller aux bords)
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      
      {/* --- RECTIFICATION : UTILISATION DE FLEXBOX AU LIEU DE GRID --- */}
      <Box sx={{ 
        display: 'flex', 
        height: '100%', 
        width: '100%', 
        gap: 2 // Espace entre le plan et la sidebar
      }}>
        
        {/* Colonne de Gauche: Le Plan (Prend tout l'espace restant avec flex: 1) */}
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0 // Important pour empêcher le débordement flex
        }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 3 }}>
            <Typography variant="h4" gutterBottom>Plan</Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              <Button variant="contained" color="error" onClick={onApp}>Stop</Button>
              <Button variant="outlined" color="info" size="small" onClick={() => simulerTache('1', '5', 'Vis A (M5->P1)', 2, 1)}>Sim (M5 - P1)</Button>
              <Button size="small" variant="outlined" onClick={() => simulerTache('2', '4', 'Plastique (M4 -> P2)', 2, 1)}>Sim (M4 - P2)</Button>
              <Button variant="outlined" color="info" size="small" onClick={() => simulerTache('3', '7', 'Colis (Fourn -> P3)', 1, 1)}>Sim (F - P3)</Button>
            </Box>
            
            {/* Grille 5x5 du Plan */}
            <Box sx={{
                flexGrow: 1,
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)', 
                gridTemplateRows: 'repeat(5, 1fr)',
                gap: '1%', 
                alignItems: 'center',      
                justifyItems: 'center', 
                width: '98%',
                height: '100%',
                padding: 1
              }}
            >
              {/* --- LIGNE 1 (HAUT) --- */}
              <Paper id="fournisseur" sx={{ ...getBoxSx('7'), gridArea: '1 / 1' }} onClick={() => handlePosteClick('7')}>{POSTE_NAMES['7']}</Paper>
              <GridArrow row={1} col={2} symbol="→" />
              <Paper id="presse" sx={{ ...getBoxSx('4'), gridArea: '1 / 3' }} onClick={() => handlePosteClick('4')}>{POSTE_NAMES['4']}</Paper>
              <GridArrow row={1} col={4} symbol="→" />
              <Paper id="machine-x" sx={{ ...getBoxSx('5'), gridArea: '1 / 5' }} onClick={() => handlePosteClick('5')}>{POSTE_NAMES['5']}</Paper>
              

              {/* --- LIGNES INTERMÉDIAIRES (Verticales) --- */}
              
              {/* Flèches descendantes à droite */}
              <GridArrow row={2} col={5} symbol="↓" />
              <Paper id="machine-y" sx={{ ...getBoxSx('6'), gridArea: '3 / 5' }} onClick={() => handlePosteClick('6')}>{POSTE_NAMES['6']}</Paper>
              <GridArrow row={4} col={5} symbol="↓" />

              {/* Flèches montantes à gauche */}
              <GridArrow row={2} col={1} symbol="↑" />
              <Paper id="poste-1" sx={{ ...getBoxSx('1'), gridArea: '3 / 1' }} onClick={() => handlePosteClick('1')}>{POSTE_NAMES['1']}</Paper>
              <GridArrow row={4} col={1} symbol="↑" />


              {/* --- LIGNE 5 (BAS) --- */}
              {/* Note: Poste 2 à gauche (1), Poste 3 au milieu (3) */}
              
              <Paper id="poste-2" sx={{ ...getBoxSx('2'), gridArea: '5 / 1' }} onClick={() => handlePosteClick('2')}>{POSTE_NAMES['2']}</Paper>
              <GridArrow row={5} col={2} symbol="←" />
              <Paper id="poste-3" sx={{ ...getBoxSx('3'), gridArea: '5 / 3' }} onClick={() => handlePosteClick('3')}>{POSTE_NAMES['3']}</Paper>
              <GridArrow row={5} col={4} symbol="←" />
              
              {/* (La case 5/5 est vide, c'est le coin du virage) */}


              {/* --- LE TRAIN --- */}
              <Typography variant="h4" className="train" sx={{
                  gridRow: trainGridPosition.gridRow,
                  gridColumn: trainGridPosition.gridColumn,
                  transition: 'all 0.5s ease-in-out',
                  textAlign: 'center',
                  m: 'auto',
                  zIndex: 10,
                  pointerEvents: 'none',
                  fontSize: '3rem',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}
              >
                🚂
              </Typography>

            </Box>
          </Paper>
        </Box>
        
        {/* Colonne de Droite: La Sidebar (Largeur Fixe) */}
        <Box sx={{ 
          width: '320px', // Largeur fixe pour éviter que la sidebar soit trop fine ou trop large
          display: 'flex', 
          flexDirection: 'column',
          flexShrink: 0 // Empêche la sidebar de s'écraser si l'écran est petit
        }}>
          <Paper elevation={2} sx={{ flexGrow: 1, p: 2, borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h4" gutterBottom>À suivre</Typography>
            
            <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, pr: 1 }}>
              {CYCLE_PATH.map(posteId => {
                const posteName = POSTE_NAMES[posteId];
                const tasksForPoste = taskGroups[posteName];
                
                if (!tasksForPoste || tasksForPoste.length === 0) return null;

                return (
                  <Paper key={posteId} elevation={1} sx={{ p: 2, mb: 2, borderLeft: '4px solid #1976d2' }}>
                    <Typography variant="h6">{posteName}</Typography>
                    <List dense>
                      {tasksForPoste.map(task => (
                        <ListItem key={task.id} 
                          secondaryAction={
                            <IconButton edge="end" onClick={() => handleDeleteTask(task.id)} color="error" size="small">
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
              })}

              {tasks.filter(t => t.status !== 'finished').length === 0 && (
                <Typography sx={{ p: 2, color: 'text.secondary' }}>Aucune tâche en attente.</Typography>
              )}
            </Box>

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
        </Box>
      </Box>
      
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