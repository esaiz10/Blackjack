import React from 'react';
import { render, screen } from '@testing-library/react-native';

import GameScreen from '../screens/GameScreen';

jest.mock('../firebaseConfig', () => ({
  auth: {},
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
}));

jest.mock('../components/cardImages', () => ({
  cardImages: {
    BACK: 1,
  },
}));

describe('GameScreen', () => {
  it('renders the main game UI', () => {
    render(<GameScreen />);

    expect(screen.getByText('Blackjack')).toBeTruthy();
    expect(screen.getByText('New Game')).toBeTruthy();
  });
});
