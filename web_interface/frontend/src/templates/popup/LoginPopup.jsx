import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  IconButton,
  Box,
  Link,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function LoginPopup({ open, onClose }) {
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login avec :", formData);
    onClose();
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    console.log("Action pour mot de passe oublié...");
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: '#CCCCCC',
          borderRadius: '15px', // Bords arrondis
          width: '350px',
          padding: '10px',
        }
      }}
    >
      
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute',
          right: -12,
          top: -12,
          color: 'white',
          backgroundColor: 'red',
          width: 32,
          height: 32,
          '&:hover': {
            backgroundColor: 'darkred',
          },
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent>
        <Box 
          component="form" 
          onSubmit={handleSubmit} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2,
            mt: 2
          }}
        >
          
          <TextField
            label="Login"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            variant="filled"
            size="small"
            required
            sx={{ backgroundColor: 'white', borderRadius: 1 }}
          />
          
          <TextField
            label="MDP"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            variant="filled"
            size="small"
            required
            sx={{ backgroundColor: 'white', borderRadius: 1 }}
          />


          <Box sx={{ textAlign: 'right', mr: 1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={handleForgotPassword}
              sx={{ color: '#444', textDecoration: 'none' }}
            >
              Mot de passe oublié ?
            </Link>
          </Box>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#E0E0E0',
                color: 'black',
                border: '1px solid #999',
                boxShadow: 'none',
                width: '120px',
                '&:hover': {
                  backgroundColor: '#D0D0D0',
                  boxShadow: 'none',
                },
              }}
            >
              Valider
            </Button>
          </Box>
          
        </Box>
      </DialogContent>
    </Dialog>
  );
}