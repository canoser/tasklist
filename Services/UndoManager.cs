using System.Collections.Generic;
using planlama_app.Models;

namespace planlama_app.Services
{
    public enum UndoActionType
    {
        Add,
        Update,
        Delete,
        BulkDelete
    }

    public class UndoAction
    {
        public UndoActionType ActionType { get; set; }
        public TaskItem Task { get; set; }
        public TaskItem PreviousState { get; set; }
        public List<TaskItem> Tasks { get; set; }
    }

    public static class UndoManager
    {
        private static readonly LinkedList<UndoAction> _undoList = new LinkedList<UndoAction>();
        private const int MaxHistory = 50;

        public static void RecordAction(UndoAction action)
        {
            _undoList.AddLast(action);
            if (_undoList.Count > MaxHistory)
            {
                _undoList.RemoveFirst();
            }
        }

        public static UndoAction PopAction()
        {
            if (_undoList.Count > 0)
            {
                var action = _undoList.Last.Value;
                _undoList.RemoveLast();
                return action;
            }
            return null;
        }

        public static bool CanUndo => _undoList.Count > 0;
        
        public static void Clear()
        {
            _undoList.Clear();
        }
    }
}
