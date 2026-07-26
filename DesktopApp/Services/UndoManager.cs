using System.Collections.Generic;
using planlama_app.Models;

namespace planlama_app.Services
{
    public enum UndoActionType
    {
        Add,
        Update,
        Delete,
        BulkDelete,
        AddResource,
        DeleteResource,
        BulkResourceAssign
    }

    public class UndoAction
    {
        public UndoActionType ActionType { get; set; }
        public TaskItem? Task { get; set; }
        public TaskItem? PreviousState { get; set; }
        public List<TaskItem>? Tasks { get; set; }
        
        // Kaynak (Resource) İle İlgili Geri Alma Alanları
        public ResourceItem? Resource { get; set; }
        public List<TaskItem>? PreviousTasksState { get; set; }
    }

    public static class UndoManager
    {
        private static readonly LinkedList<UndoAction> _undoList = new LinkedList<UndoAction>();
        private static readonly LinkedList<UndoAction> _redoList = new LinkedList<UndoAction>();
        private const int MaxHistory = 50;

        public static void RecordAction(UndoAction action)
        {
            _undoList.AddLast(action);
            if (_undoList.Count > MaxHistory)
            {
                _undoList.RemoveFirst();
            }
            _redoList.Clear();
        }

        public static UndoAction? PopAction()
        {
            if (_undoList.Count > 0)
            {
                var action = _undoList.Last.Value;
                _undoList.RemoveLast();
                _redoList.AddLast(action);
                return action;
            }
            return null;
        }

        public static UndoAction? PopRedo()
        {
            if (_redoList.Count > 0)
            {
                var action = _redoList.Last.Value;
                _redoList.RemoveLast();
                _undoList.AddLast(action);
                return action;
            }
            return null;
        }

        public static bool CanUndo => _undoList.Count > 0;
        public static bool CanRedo => _redoList.Count > 0;
        
        public static void Clear()
        {
            _undoList.Clear();
            _redoList.Clear();
        }
    }
}
