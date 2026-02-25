
import random

class Card:
    def __init__(self, suit, rank):
        self.suit = suit
        self.rank = rank

    def __str__(self):
        return f"{self.rank} of {self.suit}"

class Deck:
    def __init__(self, num_decks=6):
        self.suits = ('Hearts', 'Diamonds', 'Spades', 'Clubs')
        self.ranks = ('Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace')
        self.num_decks = num_decks
        self.cards = []
        self.running_count = 0
        self.cards_dealt_since_reshuffle = 0
        self.build_deck()

    def build_deck(self):
        self.cards = []
        for _ in range(self.num_decks):
            for suit in self.suits:
                for rank in self.ranks:
                    self.cards.append(Card(suit, rank))
        self.shuffle()
        self.running_count = 0  # Reset count on new shoe
        self.cards_dealt_since_reshuffle = 0 # Reset cards dealt on new shoe

    def shuffle(self):
        random.shuffle(self.cards)

    def deal(self, verbose=False):
        # Reshuffle if less than 20% of cards remain (Heuristic for multi-deck games)
        if len(self.cards) < (0.2 * self.num_decks * 52):
            if verbose: print("Reshuffling deck...")
            self.build_deck() # Builds a new shoe and shuffles

        card = self.cards.pop()

        # Update running count (Hi-Lo system)
        if card.rank in ('Two', 'Three', 'Four', 'Five', 'Six'):
            self.running_count += 1
        elif card.rank in ('Ten', 'Jack', 'Queen', 'King', 'Ace'):
            self.running_count -= 1

        self.cards_dealt_since_reshuffle += 1
        return card

class Hand:
    def __init__(self):
        self.cards = []

    def add_card(self, card):
        self.cards.append(card)

    def __str__(self):
        return ', '.join(str(card) for card in self.cards)

value_map = {
    'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5, 'Six': 6, 'Seven': 7, 'Eight': 8, 'Nine': 9, 'Ten': 10,
    'Jack': 10, 'Queen': 10, 'King': 10, 'Ace': 11
}

def calculate_hand_value(hand):
    value = 0
    aces = 0
    for card in hand.cards:
        value += value_map[card.rank]
        if card.rank == 'Ace':
            aces += 1

    while value > 21 and aces:
        value -= 10
        aces -= 1
    return value

def display_hands(player_hands, dealer_hand, show_dealer_full_hand=False, verbose=True):
    if not verbose: return
    # print("
--- Current Hands ---") # Commented out for cleaner output during simulation
    # for i, hand in enumerate(player_hands):
    #     print(f"Player Hand {i+1}: {hand} (Value: {calculate_hand_value(hand)})")
    # if show_dealer_full_hand:
    #     print(f"Dealer Hand: {dealer_hand} (Value: {calculate_hand_value(dealer_hand)})")
    # else:
    #     print(f"Dealer Hand: {dealer_hand.cards[0]} and one card hidden")
    # print("---------------------")
    pass # No output during simulation

def player_busts(hand):
    return calculate_hand_value(hand) > 21

def dealer_busts(dealer_hand):
    return calculate_hand_value(dealer_hand) > 21

def player_wins(player_hand, dealer_hand):
    return calculate_hand_value(player_hand) <= 21 and (calculate_hand_value(player_hand) > calculate_hand_value(dealer_hand) or calculate_hand_value(dealer_hand) > 21)

def dealer_wins(player_hand, dealer_hand):
    return calculate_hand_value(dealer_hand) <= 21 and (calculate_hand_value(dealer_hand) > calculate_hand_value(player_hand) or calculate_hand_value(player_hand) > 21)

def push(player_hand, dealer_hand):
    return calculate_hand_value(player_hand) == calculate_hand_value(dealer_hand) and calculate_hand_value(player_hand) <= 21

def ai_player_decision(player_hand, dealer_up_card_rank, running_count, cards_dealt_since_reshuffle, num_decks, verbose=True):
    current_player_value = calculate_hand_value(player_hand)
    dealer_up_value = value_map[dealer_up_card_rank]

    # Calculate true count
    remaining_cards = (num_decks * 52) - cards_dealt_since_reshuffle
    remaining_decks = remaining_cards / 52.0 if remaining_cards > 0 else 1.0 # Avoid division by zero

    true_count = running_count / remaining_decks

    # Determine if it's a soft hand (contains an Ace that can be 11 without busting)
    value_if_all_aces_are_1 = 0
    aces_count_in_hand = 0
    for card in player_hand.cards:
        if card.rank == 'Ace':
            aces_count_in_hand += 1
            value_if_all_aces_are_1 += 1 # Count Ace as 1
        else:
            value_if_all_aces_are_1 += value_map[card.rank]

    is_soft = False
    if aces_count_in_hand > 0: # If there's an Ace
        if current_player_value > value_if_all_aces_are_1: # Meaning at least one Ace is valued as 11.
            is_soft = True

    decision = ''

    # Initial Checks for Splitting and Doubling Down
    is_two_card_hand = (len(player_hand.cards) == 2)
    can_double_down = is_two_card_hand
    can_split = is_two_card_hand and (player_hand.cards[0].rank == player_hand.cards[1].rank)

    # 1. Splitting Logic (applied first, as per basic strategy priority)
    if can_split:
        pair_rank = player_hand.cards[0].rank
        pair_value = value_map[pair_rank]

        if pair_rank == 'Ace': # Always split Aces
            decision = 'p'
        elif pair_value == 8: # Always split 8s
            decision = 'p'
        elif pair_value == 10: # Never split 10s (10, J, Q, K)
            pass # Fall through to regular hit/stand logic if no other action
        elif pair_value == 2 or pair_value == 3: # Split 2s, 3s against 2-7
            if 2 <= dealer_up_value <= 7:
                decision = 'p'
        elif pair_value == 7: # Split 7s against 2-7
            if 2 <= dealer_up_value <= 7:
                decision = 'p'
        elif pair_value == 6: # Split 6s against 2-6
            if 2 <= dealer_up_value <= 6:
                decision = 'p'
        elif pair_value == 9: # Split 9s against 2-9, except 7
            if (2 <= dealer_up_value <= 6) or (dealer_up_value == 8 or dealer_up_value == 9):
                decision = 'p'
        elif pair_value == 4: # Split 4s against 5-6 (Count dependent deviation)
            if dealer_up_value == 5 or dealer_up_value == 6:
                decision = 'p'
        elif pair_value == 5: # Never split 5s (count deviation: double if +3 or more)
            if true_count >= 3 and (2 <= dealer_up_value <= 9): # Double if favorable count
                 decision = 'd'
            else: # Otherwise treat as hard 10
                if 2 <= dealer_up_value <= 9: decision = 'd'


    # 2. Doubling Down Logic (only if not splitting and is a two-card hand, after checking for splits)
    if not decision and can_double_down:
        if is_soft: # Soft Totals for Doubling Down
            if current_player_value == 13 or current_player_value == 14: # Soft 13 (A,2), Soft 14 (A,3)
                if dealer_up_value == 5 or dealer_up_value == 6: decision = 'd'
                # Count dependent deviation: double A2 vs 4 if TC > 2; A3 vs 4 if TC > 1
                elif dealer_up_value == 4 and ( (current_player_value == 13 and true_count > 2) or (current_player_value == 14 and true_count > 1) ):
                    decision = 'd'
            elif current_player_value == 15 or current_player_value == 16: # Soft 15 (A,4), Soft 16 (A,5)
                if dealer_up_value in [4,5,6]: decision = 'd'
                # Count dependent deviation: double A4 vs 3 if TC > 0; A5 vs 3 if TC > 1
                elif dealer_up_value == 3 and ( (current_player_value == 15 and true_count > 0) or (current_player_value == 16 and true_count > 1) ):
                    decision = 'd'
            elif current_player_value == 17: # Soft 17 (A,6)
                if 3 <= dealer_up_value <= 6: decision = 'd'
                # Count dependent deviation: double A6 vs 2 if TC > 1
                elif dealer_up_value == 2 and true_count > 1:
                    decision = 'd'
            elif current_player_value == 18: # Soft 18 (A,7)
                if 2 <= dealer_up_value <= 6: decision = 'd'
                # Count dependent deviation: double A7 vs 2 if TC > 0; A7 vs 7 if TC > 2; A7 vs 8 if TC > 4
                elif (dealer_up_value == 2 and true_count > 0) or                      (dealer_up_value == 7 and true_count > 2) or                      (dealer_up_value == 8 and true_count > 4):
                    decision = 'd'
        else: # Hard Totals for Doubling Down
            if current_player_value == 9:
                if 3 <= dealer_up_value <= 6: decision = 'd'
                # Count dependent deviation: double 9 vs 2 if TC > 1; 9 vs 7 if TC > 3
                elif (dealer_up_value == 2 and true_count > 1) or                      (dealer_up_value == 7 and true_count > 3):
                    decision = 'd'
            elif current_player_value == 10:
                if 2 <= dealer_up_value <= 9: decision = 'd'
                # Count dependent deviation: double 10 vs 10 if TC > 3
                elif dealer_up_value == 10 and true_count > 3: 
                    decision = 'd'
            elif current_player_value == 11:
                if 2 <= dealer_up_value <= 10: decision = 'd'
                # Count dependent deviation: double 11 vs Ace if TC > 1
                elif dealer_up_value == 11 and true_count > 1: # Ace is 11 in value_map
                    decision = 'd'

    # 3. Fallback to Hit/Stand Logic (if no split or double down decision made)
    if not decision:
        if is_soft: # Soft Totals (with an Ace counted as 11)
            if current_player_value >= 19: # Soft 19 or more
                decision = 's'
            elif current_player_value == 18: # Soft 18 (Ace-7)
                if dealer_up_value in [2, 7, 8]: decision = 's'
                # Count dependent deviation: stand A7 vs 9 if TC > 0; A7 vs 10 if TC > 2; A7 vs Ace if TC > 4
                elif (dealer_up_value == 9 and true_count > 0) or                      (dealer_up_value == 10 and true_count > 2) or                      (dealer_up_value == 11 and true_count > 4):
                    decision = 's'
                else: decision = 'h'
            elif current_player_value <= 17: # Soft 17 or less (e.g., Ace-6 or lower)
                decision = 'h'
        else: # Hard Totals (no Aces or Aces counted as 1)
            if current_player_value >= 17: 
                decision = 's'
            elif current_player_value <= 11: 
                decision = 'h'
            elif current_player_value == 12:
                if 4 <= dealer_up_value <= 6: decision = 's'
                # Count dependent deviation: stand 12 vs 2 if TC > 3; 12 vs 3 if TC > 2
                elif (dealer_up_value == 2 and true_count > 3) or                      (dealer_up_value == 3 and true_count > 2):
                    decision = 's'
                else: decision = 'h'
            elif current_player_value == 13:
                if 2 <= dealer_up_value <= 6: decision = 's'
                # Count dependent deviation: stand 13 vs 2 if TC > -1; 13 vs 3 if TC > -2
                elif (dealer_up_value == 2 and true_count > -1) or                      (dealer_up_value == 3 and true_count > -2):
                    decision = 's'
                else: decision = 'h'
            elif current_player_value == 14:
                if 2 <= dealer_up_value <= 6: decision = 's'
                # Count dependent deviation: stand 14 vs 2 if TC > 0
                elif dealer_up_value == 2 and true_count > 0:
                    decision = 's'
                else: decision = 'h'
            elif current_player_value == 15:
                if 2 <= dealer_up_value <= 6: decision = 's'
                # Count dependent deviation: stand 15 vs 10 if TC > 3
                elif dealer_up_value == 10 and true_count > 3:
                    decision = 's'
                else: decision = 'h'
            elif current_player_value == 16:
                if 2 <= dealer_up_value <= 6: decision = 's'
                # Count dependent deviation: stand 16 vs 9 if TC > 4; 16 vs 10 if TC > 0; 16 vs Ace if TC > 3
                elif (dealer_up_value == 9 and true_count > 4) or                      (dealer_up_value == 10 and true_count > 0) or                      (dealer_up_value == 11 and true_count > 3):
                    decision = 's'
                else: decision = 'h'

    if verbose:
        if decision == 'h':
            print(f"AI Player Hand (Value: {current_player_value}, Dealer Up: {dealer_up_card_rank}:{dealer_up_value}, {{'Soft' if is_soft else 'Hard'}}, TC: {true_count:.2f}) decides to Hit.")
        elif decision == 's':
            print(f"AI Player Hand (Value: {current_player_value}, Dealer Up: {dealer_up_card_rank}:{dealer_up_value}, {{'Soft' if is_soft else 'Hard'}}, TC: {true_count:.2f}) decides to Stand.")
        elif decision == 'd':
            print(f"AI Player Hand (Value: {current_player_value}, Dealer Up: {dealer_up_card_rank}:{dealer_up_value}, {{'Soft' if is_soft else 'Hard'}}, TC: {true_count:.2f}) decides to Double Down.")
        elif decision == 'p':
            print(f"AI Player Hand (Value: {current_player_value}, Dealer Up: {dealer_up_card_rank}:{dealer_up_value}, {{'Soft' if is_soft else 'Hard'}}, TC: {true_count:.2f}) decides to Split.")
    return decision

def play_blackjack(player_type='human', verbose=True):
    game_deck = Deck() # Initialize with default 6 decks

    player_hands = [Hand()] # Player can have multiple hands after splits
    dealer_hand = Hand()

    # Initial deal
    player_hands[0].add_card(game_deck.deal(verbose=verbose))
    dealer_hand.add_card(game_deck.deal(verbose=verbose))
    player_hands[0].add_card(game_deck.deal(verbose=verbose))
    dealer_hand.add_card(game_deck.deal(verbose=verbose))

    if verbose: print("Welcome to Blackjack!")

    # Player's Turn for all hands
    current_hand_index = 0
    while current_hand_index < len(player_hands):
        current_player_hand = player_hands[current_hand_index]

        # if verbose: print(f"
--- Playing Hand {current_hand_index + 1} ---") # Commented out for cleaner output during simulation
        while True:
            display_hands(player_hands, dealer_hand, verbose=verbose)

            if player_busts(current_player_hand):
                if verbose: print(f"Player Hand {current_hand_index + 1} busts! You lose this hand.")
                break # End turn for this hand

            choice = ''
            if player_type == 'human':
                choice = input("Do you want to Hit, Stand, Double Down (d), or Split (p)? (h/s/d/p): ").lower()
            elif player_type == 'ai':
                dealer_up_card_rank = dealer_hand.cards[0].rank
                # Pass card counting information to AI decision
                choice = ai_player_decision(current_player_hand, dealer_up_card_rank, game_deck.running_count, game_deck.cards_dealt_since_reshuffle, game_deck.num_decks, verbose=verbose)
            else:
                if verbose: print("Invalid player type. Defaulting to human.")
                choice = input("Do you want to Hit, Stand, Double Down (d), or Split (p)? (h/s/d/p): ").lower()

            if choice == 'h':
                current_player_hand.add_card(game_deck.deal(verbose=verbose))
            elif choice == 's':
                if verbose: print(f"Player Hand {current_hand_index + 1} stands.")
                break # End turn for this hand
            elif choice == 'd': # Double Down
                if len(current_player_hand.cards) == 2: # Can only double down on a two-card hand
                    if verbose: print(f"Player Hand {current_hand_index + 1} doubles down.")
                    current_player_hand.add_card(game_deck.deal(verbose=verbose)) # Player gets exactly one more card
                    break # End turn for this hand
                else:
                    if verbose: print("Cannot double down on this hand (must be a two-card hand). AAI reverts to Hit.")
                    choice = 'h' # AI would revert to hit if double not allowed
                    current_player_hand.add_card(game_deck.deal(verbose=verbose))
            elif choice == 'p': # Split
                if len(current_player_hand.cards) == 2 and (current_player_hand.cards[0].rank == current_player_hand.cards[1].rank): # Can only split pairs
                    if verbose: print(f"Player Hand {current_hand_index + 1} decides to Split.")
                    card1 = current_player_hand.cards.pop(0)
                    card2 = current_player_hand.cards.pop(0)

                    # Re-initialize the current hand with one card and deal a new one
                    current_player_hand.add_card(card1)
                    current_player_hand.add_card(game_deck.deal(verbose=verbose))

                    # Create a new hand for the second card and deal a new one
                    new_split_hand = Hand()
                    new_split_hand.add_card(card2)
                    new_split_hand.add_card(game_deck.deal(verbose=verbose))

                    # Insert the new hand immediately after the current hand in the list
                    player_hands.insert(current_hand_index + 1, new_split_hand)

                    # Special rule for split Aces: they get only one card and automatically stand
                    if card1.rank == 'Ace':
                        if verbose: print(f"Split Aces: Hand {current_hand_index + 1} and Hand {current_hand_index + 2} both receive one card and stand automatically.")
                        break # Current hand (first split hand) stands
                    # For other splits, the current hand's turn continues normally
                    break # Re-evaluate current hand or move to next

                else:
                    if verbose: print("Cannot split this hand (must be a pair of two cards). AAI reverts to Hit.")
                    choice = 'h' # AI would revert to hit if split not allowed
                    current_player_hand.add_card(game_deck.deal(verbose=verbose))
            else:
                if player_type == 'human':
                    if verbose: print("Invalid choice. Please enter 'h', 's', 'd', or 'p'.")

        # Move to the next hand in the list after current hand finishes its turn
        current_hand_index += 1

    # Dealer's Turn (only if at least one player hand hasn't busted)
    if any(not player_busts(hand) for hand in player_hands):
        while calculate_hand_value(dealer_hand) < 17:
            dealer_hand.add_card(game_deck.deal(verbose=verbose))

    # Determine Winner for each player hand
    # if verbose: print("
--- Final Hands ---") # Commented out for cleaner output during simulation
    # display_hands(player_hands, dealer_hand, show_dealer_full_hand=True, verbose=verbose)

    outcomes = []
    for i, p_hand in enumerate(player_hands):
        player_final_value = calculate_hand_value(p_hand)
        dealer_final_value = calculate_hand_value(dealer_hand)

        if player_busts(p_hand):
            # if verbose: print(f"Hand {i+1}: Player busts! Dealer wins.") # Commented out for cleaner output during simulation
            outcomes.append("loss")
        elif dealer_busts(dealer_hand):
            # if verbose: print(f"Hand {i+1}: Dealer busts! Player wins.") # Commented out for cleaner output during simulation
            outcomes.append("win")
        elif player_final_value > dealer_final_value:
            # if verbose: print(f"Hand {i+1}: Player wins!") # Commented out for cleaner output during simulation
            outcomes.append("win")
        elif dealer_final_value > player_final_value:
            # if verbose: print(f"Hand {i+1}: Dealer wins!") # Commented out for cleaner output during simulation
            outcomes.append("loss")
        else:
            # if verbose: print(f"Hand {i+1}: It's a push!") # Commented out for cleaner output during simulation
            outcomes.append("push")

    return outcomes

def simulate_blackjack_games(num_simulations):
    wins = 0
    losses = 0
    pushes = 0

    print(f"Simulating {num_simulations} games...")
    for i in range(num_simulations):
        if (i + 1) % 5000 == 0: # Print progress less frequently for advanced simulation
            print(f"  Completed {i + 1}/{num_simulations} simulations.")

        # play_blackjack now returns a list of outcomes
        game_outcomes = play_blackjack(player_type='ai', verbose=False)
        for outcome in game_outcomes:
            if outcome == 'win':
                wins += 1
            elif outcome == 'loss':
                losses += 1
            elif outcome == 'push':
                pushes += 1

    # Adjust total games for statistics, as splits mean more than one outcome per game
    total_outcomes = wins + losses + pushes # This represents total individual hands played

    print(f"Simulation complete. Total individual hands played: {total_outcomes}")
    return wins, losses, pushes, total_outcomes
