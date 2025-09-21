import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import './App.css';

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [playerColor, setPlayerColor] = useState('white');
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState('');
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [language, setLanguage] = useState('pt'); // pt or en
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionMove, setPromotionMove] = useState(null);

  const pieceSymbols = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  const pieceValues = {
    'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
  };

  const translations = {
    pt: {
      title: 'Jogo de Xadrez',
      checkmate: 'Xeque-mate!',
      check: 'Xeque!',
      draw: 'Empate!',
      whitesWin: 'Brancas vencem!',
      blacksWin: 'Pretas vencem!',
      player: 'Jogador',
      computer: 'Computador',
      turn: 'Turno',
      your: 'Seu',
      playAs: 'Jogar como',
      white: 'Brancas',
      black: 'Pretas',
      undoMove: 'Desfazer Jogada',
      restartGame: 'Reiniciar Jogo',
      moveHistory: 'Histórico de Jogadas',
      capturedWhite: 'Peças Brancas Capturadas',
      capturedBlack: 'Peças Pretas Capturadas',
      value: 'Valor',
      promotion: 'Promoção do Peão',
      choosePromotion: 'Escolha uma peça para promoção:',
      queen: 'Rainha',
      rook: 'Torre',
      bishop: 'Bispo',
      knight: 'Cavalo',
      cancel: 'Cancelar',
      language: 'Idioma'
    },
    en: {
      title: 'Chess Game',
      checkmate: 'Checkmate!',
      check: 'Check!',
      draw: 'Draw!',
      whitesWin: 'White wins!',
      blacksWin: 'Black wins!',
      player: 'Player',
      computer: 'Computer',
      turn: 'Turn',
      your: 'Your',
      playAs: 'Play as',
      white: 'White',
      black: 'Black',
      undoMove: 'Undo Move',
      restartGame: 'Restart Game',
      moveHistory: 'Move History',
      capturedWhite: 'Captured White Pieces',
      capturedBlack: 'Captured Black Pieces',
      value: 'Value',
      promotion: 'Pawn Promotion',
      choosePromotion: 'Choose piece for promotion:',
      queen: 'Queen',
      rook: 'Rook',
      bishop: 'Bishop',
      knight: 'Knight',
      cancel: 'Cancel',
      language: 'Language'
    }
  };

  const t = translations[language];

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setSelectedSquare(null);
    setMoveHistory([]);
    setGameStatus('');
    setPossibleMoves([]);
    setLastMove(null);
    setCapturedPieces({ white: [], black: [] });
    // Sempre resetar para o turno correto baseado na cor do jogador
    setIsPlayerTurn(playerColor === 'white');
  };

  const togglePlayerColor = () => {
    const newColor = playerColor === 'white' ? 'black' : 'white';
    setPlayerColor(newColor);
    
    // Reset complete do jogo
    const newGame = new Chess();
    setGame(newGame);
    setSelectedSquare(null);
    setMoveHistory([]);
    setGameStatus('');
    setPossibleMoves([]);
    setLastMove(null);
    setCapturedPieces({ white: [], black: [] });
    
    // Definir quem começa baseado na nova cor
    // Se jogador escolheu brancas, ele começa (brancas sempre começam)
    // Se jogador escolheu pretas, IA começa
    setIsPlayerTurn(newColor === 'white');
  };

  const undoMove = () => {
    if (moveHistory.length === 0) return;
    
    const newHistory = [...moveHistory];
    newHistory.pop();
    
    try {
      game.undo();
      if (!isPlayerTurn && newHistory.length > 0) {
        game.undo();
        newHistory.pop();
      }
      
      setMoveHistory(newHistory);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setIsPlayerTurn(true);
      setLastMove(newHistory.length > 0 ? newHistory[newHistory.length - 1] : null);
      
      // Recalcular peças capturadas
      const newCaptured = { white: [], black: [] };
      newHistory.forEach(move => {
        if (move.captured) {
          const color = move.color === 'w' ? 'black' : 'white';
          newCaptured[color].push(move.captured);
        }
      });
      setCapturedPieces(newCaptured);
      
    } catch (error) {
      console.error('Erro ao desfazer jogada:', error);
    }
  };

  const makeComputerMove = useCallback(() => {
    if (game.isGameOver()) return;
    
    // Verificar se é realmente o turno da IA
    const gameCurrentTurn = game.turn(); // 'w' para brancas, 'b' para pretas
    const shouldComputerPlay = 
      (playerColor === 'white' && gameCurrentTurn === 'b') || 
      (playerColor === 'black' && gameCurrentTurn === 'w');
    
    if (!shouldComputerPlay || isPlayerTurn) return;

    setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) return;

      // IA melhorada: priorizar capturas, depois centralização
      let selectedMove;
      
      // 1. Procurar capturas valiosas
      const captures = moves.filter(move => move.captured);
      if (captures.length > 0) {
        captures.sort((a, b) => pieceValues[b.captured] - pieceValues[a.captured]);
        selectedMove = captures[0];
      } else {
        // 2. Preferir movimentos para o centro
        const centerSquares = ['d4', 'd5', 'e4', 'e5'];
        const centerMoves = moves.filter(move => centerSquares.includes(move.to));
        
        if (centerMoves.length > 0) {
          selectedMove = centerMoves[Math.floor(Math.random() * centerMoves.length)];
        } else {
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        }
      }

      const move = game.move(selectedMove);
      
      if (move) {
        const newHistory = [...moveHistory, move];
        setMoveHistory(newHistory);
        setLastMove(move);
        
        if (move.captured) {
          const color = move.color === 'w' ? 'black' : 'white';
          setCapturedPieces(prev => ({
            ...prev,
            [color]: [...prev[color], move.captured]
          }));
        }
        
        setIsPlayerTurn(true);
      }
    }, 750);
  }, [game, isPlayerTurn, moveHistory, playerColor]);

  useEffect(() => {
    // Verificar se é turno da IA baseado na cor do jogador e estado atual do jogo
    const gameCurrentTurn = game.turn(); // 'w' para brancas, 'b' para pretas
    const shouldComputerPlay = 
      (playerColor === 'white' && gameCurrentTurn === 'b') || 
      (playerColor === 'black' && gameCurrentTurn === 'w');
    
    if (shouldComputerPlay && !game.isGameOver() && !isPlayerTurn) {
      makeComputerMove();
    }
  }, [isPlayerTurn, makeComputerMove, game, playerColor]);

  useEffect(() => {
    if (game.isCheckmate()) {
      setGameStatus(`${t.checkmate} ${game.turn() === 'w' ? t.blacksWin : t.whitesWin}`);
    } else if (game.isDraw()) {
      setGameStatus(t.draw);
    } else if (game.isCheck()) {
      setGameStatus(t.check);
    } else {
      setGameStatus('');
    }
  }, [game, t]);

  const handlePromotion = (piece) => {
    if (!promotionMove) return;
    
    try {
      const move = game.move({
        from: promotionMove.from,
        to: promotionMove.to,
        promotion: piece
      });

      if (move) {
        const newHistory = [...moveHistory, move];
        setMoveHistory(newHistory);
        setLastMove(move);
        
        if (move.captured) {
          const color = move.color === 'w' ? 'black' : 'white';
          setCapturedPieces(prev => ({
            ...prev,
            [color]: [...prev[color], move.captured]
          }));
        }
        
        setSelectedSquare(null);
        setPossibleMoves([]);
        setIsPlayerTurn(false);
      }
    } catch (error) {
      console.error('Erro na promoção:', error);
    }
    
    setShowPromotionModal(false);
    setPromotionMove(null);
  };

  const handleSquareClick = (square) => {
    if (game.isGameOver() || showPromotionModal) return;
    
    // Verificar se é realmente o turno do jogador
    const gameCurrentTurn = game.turn(); // 'w' para brancas, 'b' para pretas
    const isReallyPlayerTurn = 
      (playerColor === 'white' && gameCurrentTurn === 'w') || 
      (playerColor === 'black' && gameCurrentTurn === 'b');
    
    if (!isReallyPlayerTurn) return;

    const piece = game.get(square);
    
    if (selectedSquare === square) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    if (selectedSquare && possibleMoves.some(move => move.to === square)) {
      // Verificar se é uma promoção
      const selectedPiece = game.get(selectedSquare);
      const isPromotion = selectedPiece && selectedPiece.type === 'p' && 
        ((selectedPiece.color === 'w' && square[1] === '8') || 
         (selectedPiece.color === 'b' && square[1] === '1'));

      if (isPromotion) {
        setPromotionMove({ from: selectedSquare, to: square });
        setShowPromotionModal(true);
        return;
      }

      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q'
        });

        if (move) {
          const newHistory = [...moveHistory, move];
          setMoveHistory(newHistory);
          setLastMove(move);
          
          if (move.captured) {
            const color = move.color === 'w' ? 'black' : 'white';
            setCapturedPieces(prev => ({
              ...prev,
              [color]: [...prev[color], move.captured]
            }));
          }
          
          setSelectedSquare(null);
          setPossibleMoves([]);
          setIsPlayerTurn(false);
        }
      } catch (error) {
        console.error('Movimento inválido:', error);
      }
      return;
    }

    // Verificar se a peça pertence ao jogador
    const playerGameColor = playerColor === 'white' ? 'w' : 'b';
    if (piece && piece.color === playerGameColor) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setPossibleMoves(moves);
    } else {
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const renderSquare = (square, piece, rowIndex, colIndex) => {
    const isSelected = selectedSquare === square;
    const isPossibleMove = possibleMoves.some(move => move.to === square);
    const isLastMoveSquare = lastMove && (lastMove.from === square || lastMove.to === square);
    const isLightSquare = (rowIndex + colIndex) % 2 === 0;
    
    const isKingInCheck = game.isCheck() && piece && piece.type === 'k' && 
      piece.color === game.turn();
    
    const isKingInCheckmate = game.isCheckmate() && piece && piece.type === 'k' && 
      piece.color === game.turn();

    return (
      <div
        key={square}
        className={`square ${isLightSquare ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isPossibleMove ? 'possible-move' : ''} ${isLastMoveSquare ? 'last-move' : ''} ${isKingInCheck ? 'king-in-check' : ''} ${isKingInCheckmate ? 'king-in-checkmate' : ''}`}
        onClick={() => handleSquareClick(square)}
      >
        {piece && (
          <div className={`piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'} ${isKingInCheck ? 'check-animation' : ''} ${isKingInCheckmate ? 'checkmate-animation' : ''}`}>
            {pieceSymbols[piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase()] || ''}
          </div>
        )}
        {isPossibleMove && <div className="move-indicator"></div>}
      </div>
    );
  };

  const renderBoard = () => {
    const board = game.board();
    const rows = playerColor === 'white' ? 
      ['8', '7', '6', '5', '4', '3', '2', '1'] : 
      ['1', '2', '3', '4', '5', '6', '7', '8'];
    const cols = playerColor === 'white' ? 
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] : 
      ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];

    return (
      <div className="board">
        {rows.map((row, rowIndex) => (
          cols.map((col, colIndex) => {
            const square = col + row;
            const piece = game.get(square);
            return renderSquare(square, piece, rowIndex, colIndex);
          })
        ))}
      </div>
    );
  };

  const renderCapturedPieces = (color) => {
    const pieces = capturedPieces[color];
    const totalValue = pieces.reduce((sum, piece) => sum + pieceValues[piece.toLowerCase()], 0);
    
    return (
      <div className="captured-pieces">
        <h4>{color === 'white' ? t.capturedWhite : t.capturedBlack}</h4>
        <div className="pieces-list">
          {pieces.map((piece, index) => (
            <span key={index} className="captured-piece">
              {pieceSymbols[piece]}
            </span>
          ))}
        </div>
        <div className="material-advantage">{t.value}: {totalValue}</div>
      </div>
    );
  };

  const renderMoveHistory = () => {
    const formattedHistory = [];
    for (let i = 0; i < moveHistory.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const whiteMove = moveHistory[i];
      const blackMove = moveHistory[i + 1];
      
      formattedHistory.push({
        number: moveNumber,
        white: whiteMove ? whiteMove.san : '',
        black: blackMove ? blackMove.san : ''
      });
    }

    return (
      <div className="move-history">
        <h4>{t.moveHistory}</h4>
        <div className="moves-table">
          {formattedHistory.map((move) => (
            <div key={move.number} className="move-row">
              <div className="move-number">{move.number}.</div>
              <div className="move-white">{move.white}</div>
              <div className="move-black">{move.black}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPromotionModal = () => {
    if (!showPromotionModal) return null;

    const promotionPieces = [
      { piece: 'q', symbol: playerColor === 'white' ? '♕' : '♛', name: t.queen },
      { piece: 'r', symbol: playerColor === 'white' ? '♖' : '♜', name: t.rook },
      { piece: 'b', symbol: playerColor === 'white' ? '♗' : '♝', name: t.bishop },
      { piece: 'n', symbol: playerColor === 'white' ? '♘' : '♞', name: t.knight }
    ];

    return (
      <div className="modal-overlay">
        <div className="promotion-modal">
          <h3>{t.promotion}</h3>
          <p>{t.choosePromotion}</p>
          <div className="promotion-options">
            {promotionPieces.map(({ piece, symbol, name }) => (
              <button
                key={piece}
                className="promotion-button"
                onClick={() => handlePromotion(piece)}
              >
                <div className="promotion-piece">{symbol}</div>
                <div className="promotion-name">{name}</div>
              </button>
            ))}
          </div>
          <button 
            className="cancel-button"
            onClick={() => {
              setShowPromotionModal(false);
              setPromotionMove(null);
            }}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="chess-app">
      <div className="game-header">
        <div className="header-top">
          <div className="language-selector">
            <span>{t.language}:</span>
            <button 
              className={`lang-button ${language === 'pt' ? 'active' : ''}`}
              onClick={() => setLanguage('pt')}
            >
              PT
            </button>
            <button 
              className={`lang-button ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>
        </div>
        <h1 className="game-title">♔ {t.title} ♛</h1>
        <div className="game-status">{gameStatus}</div>
      </div>

      <div className="game-container">
        <div className="board-container">
          <div className="player-info">
            <div className={`player-section ${!isPlayerTurn ? 'current-turn' : ''}`}>
              <div className="player-name">{t.computer}</div>
              <div className="player-color">{playerColor === 'white' ? t.black : t.white}</div>
            </div>
            <div className={`player-section ${isPlayerTurn ? 'current-turn' : ''}`}>
              <div className="player-name">{t.player}</div>
              <div className="player-color">{playerColor === 'white' ? t.white : t.black}</div>
            </div>
          </div>
          {renderBoard()}
        </div>

        <div className="controls">
          <button 
            className="button primary" 
            onClick={togglePlayerColor}
            disabled={showPromotionModal}
          >
            {t.playAs} {playerColor === 'white' ? t.black : t.white}
          </button>
          
          <button 
            className="button secondary" 
            onClick={undoMove}
            disabled={moveHistory.length === 0 || showPromotionModal}
          >
             {t.undoMove}
          </button>
          
          <button 
            className="button danger" 
            onClick={resetGame}
            disabled={showPromotionModal}
          >
             {t.restartGame}
          </button>

          {renderMoveHistory()}
          {renderCapturedPieces('white')}
          {renderCapturedPieces('black')}
        </div>
      </div>

      {renderPromotionModal()}
    </div>
  );
};

export default ChessGame;