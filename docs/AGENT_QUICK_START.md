# Agent Quick Start Guide

**Welcome to the Akiva AI Crypto multi-agent development team!** 🚀

This guide will get you started quickly and safely.

---

## 🎯 Your First 5 Minutes

### 1. Read These Documents (In Order):
1. **`MULTI_AGENT_COORDINATION.md`** - How we work together
2. **`CRITICAL_FILES_PROTECTION.md`** - Files you must NOT edit
3. **`PHASE_1_IMPLEMENTATION_PLAN.md`** - What we're building
4. **`AGENT_ACTIVITY_LOG.md`** - What others are doing

### 2. Understand Your Role:

#### If You're **Open Hands** (Backend/Python):
- **Focus:** Core backtesting engine and validation
- **Your Files:** `backend/app/services/`, `backend/app/models/`, `backend/tests/`
- **Your Stack:** Python, FastAPI, FreqTrade, NumPy, Pandas
- **Your Week 1 Goal:** Build institutional-grade backtesting pipeline

#### If You're **CLINE** (Frontend/TypeScript):
- **Focus:** Strategy research dashboard and visualization
- **Your Files:** `src/pages/`, `src/components/strategy/`, `src/hooks/`
- **Your Stack:** React, TypeScript, Recharts, TanStack Query
- **Your Week 1 Goal:** Build strategy research dashboard with basic charts

#### If You're **Augment Code** (Architecture):
- **Focus:** System design, integration, coordination
- **Your Files:** Documentation, architecture diagrams, code reviews
- **Your Stack:** Everything (review and coordinate)
- **Your Week 1 Goal:** Design system architecture and coordinate agents

---

## 🔒 Safety First

### Before You Write ANY Code:

1. **Check Critical Files:**
   ```bash
   # Read this file first!
   cat docs/CRITICAL_FILES_PROTECTION.md
   ```

2. **Check Activity Log:**
   ```bash
   # See what others are doing
   cat docs/AGENT_ACTIVITY_LOG.md
   ```

3. **Claim Your Task:**
   - Add entry to `AGENT_ACTIVITY_LOG.md`
   - Format: `[YYYY-MM-DD HH:MM] [AGENT_NAME] [STATUS] Task description`
   - Example: `[2026-01-09 10:00] [Open Hands] [IN_PROGRESS] Building InstitutionalBacktester class`

### While You're Coding:

1. **Stay in Your Lane:**
   - Open Hands: Backend only
   - CLINE: Frontend only
   - Augment Code: Documentation and reviews

2. **Write Tests:**
   - Every function needs a test
   - Every component needs a test
   - No exceptions!

3. **Document Everything:**
   - Add docstrings to all functions
   - Add comments for complex logic
   - Update README if needed

### Before You Commit:

1. **Run Pre-Commit Checklist:**
   ```bash
   # On Windows (PowerShell)
   .\scripts\pre-commit-checklist.ps1
   
   # On Mac/Linux
   ./scripts/pre-commit-checklist.sh
   ```

2. **Update Activity Log:**
   - Mark task as `[COMPLETE]`
   - Add summary of changes

3. **Update Change Log:**
   - Add entry to `CHANGE_LOG.md`
   - Follow semantic versioning

4. **Get User Approval:**
   - **NEVER push without user approval**
   - Show user what you've done
   - Wait for explicit "push" command

---

## 📋 Week 1 Quick Reference

### Open Hands - Week 1 Tasks:

**Day 1-2: Backtesting Pipeline**
```python
# Create: backend/app/services/institutional_backtester.py

class InstitutionalBacktester:
    """
    Professional-grade backtesting engine.
    
    Features:
    - In-sample/out-of-sample split (60/20/20)
    - Proper order execution simulation
    - Slippage and commission models
    - Position sizing logic
    - Walk-forward ready
    """
    
    def run_backtest(
        self,
        strategy: IStrategy,
        data: pd.DataFrame,
        config: BacktestConfig
    ) -> BacktestResult:
        # 1. Split data (60% train, 20% validate, 20% test)
        # 2. Run strategy on each split
        # 3. Calculate metrics
        # 4. Return comprehensive results
        pass
```

**Day 3-4: Performance Metrics**
```python
# Create: backend/app/services/performance_metrics.py

class PerformanceMetrics:
    """Calculate institutional-grade performance metrics."""
    
    def calculate_sharpe_ratio(self, returns: pd.Series) -> float:
        """Sharpe ratio: (mean return - risk_free_rate) / std_dev"""
        pass
    
    def calculate_sortino_ratio(self, returns: pd.Series) -> float:
        """Sortino ratio: Only penalize downside volatility"""
        pass
    
    def calculate_max_drawdown(self, equity_curve: pd.Series) -> float:
        """Maximum peak-to-trough decline"""
        pass
```

**Day 5: Integration**
- Create API endpoints
- Add database models
- Test end-to-end

---

### CLINE - Week 1 Tasks:

**Day 1-2: Dashboard Structure**
```typescript
// Create: src/pages/StrategyResearch.tsx

export default function StrategyResearch() {
  return (
    <div className="container mx-auto p-6">
      <h1>Strategy Research</h1>
      
      {/* Strategy selector */}
      <StrategySelector />
      
      {/* Performance metrics */}
      <PerformanceMetrics />
      
      {/* Equity curve */}
      <EquityCurveChart />
      
      {/* Drawdown chart */}
      <DrawdownChart />
    </div>
  );
}
```

**Day 3-4: Basic Visualization**
```typescript
// Create: src/components/strategy/EquityCurveChart.tsx

export function EquityCurveChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="equity" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

**Day 5: Integration**
- Create `useBacktestResults` hook
- Connect to backend API
- Test data flow

---

### Augment Code - Week 1 Tasks:

**Day 1: Architecture Design**
- Design system architecture
- Define API contracts
- Create sequence diagrams

**Day 2-3: Code Reviews**
- Review Open Hands code
- Review CLINE code
- Provide feedback

**Day 4: Integration**
- Ensure frontend/backend compatibility
- Validate API contracts
- Test data flow

**Day 5: Documentation**
- Update architecture docs
- Document API endpoints
- Create integration guide

---

## 🛠️ Development Workflow

### 1. Start Your Day:
```bash
# Pull latest changes
git pull

# Check activity log
cat docs/AGENT_ACTIVITY_LOG.md

# Claim your task
echo "[$(date)] [YOUR_NAME] [IN_PROGRESS] Your task" >> docs/AGENT_ACTIVITY_LOG.md
```

### 2. During Development:
```bash
# Run tests frequently
npm test  # Frontend
pytest    # Backend

# Check your work
npm run type-check  # Frontend
mypy .              # Backend
```

### 3. Before Committing:
```bash
# Run pre-commit checklist
./scripts/pre-commit-checklist.sh

# Stage your changes
git add <your-files>

# Commit with descriptive message
git commit -m "feat(backtesting): Add InstitutionalBacktester class

- Implement in-sample/out-of-sample split
- Add slippage and commission models
- Add position sizing logic
- Add comprehensive tests"

# Update logs
# (Add to AGENT_ACTIVITY_LOG.md and CHANGE_LOG.md)

# Get user approval before pushing!
```

---

## 🚨 Common Mistakes to Avoid

### ❌ DON'T:
1. Edit critical files (see `CRITICAL_FILES_PROTECTION.md`)
2. Push without user approval
3. Work on files outside your domain
4. Skip writing tests
5. Commit without updating logs
6. Make breaking changes without discussion

### ✅ DO:
1. Read documentation first
2. Check activity log before starting
3. Write tests for everything
4. Document your code
5. Update logs before committing
6. Ask questions if unsure
7. Coordinate with other agents

---

## 💬 Communication

### Activity Log Format:
```
[2026-01-09 10:00] [Open Hands] [IN_PROGRESS] Building InstitutionalBacktester
[2026-01-09 14:30] [Open Hands] [COMPLETE] InstitutionalBacktester - Added in-sample/out-of-sample split
[2026-01-09 15:00] [CLINE] [IN_PROGRESS] Building StrategyResearch page
```

### Status Codes:
- `[IN_PROGRESS]` - Currently working on this
- `[COMPLETE]` - Task finished
- `[BLOCKED]` - Waiting on something
- `[REVIEW]` - Ready for review
- `[QUESTION]` - Need help/clarification

---

## 📚 Key Resources

### Documentation:
- `MULTI_AGENT_COORDINATION.md` - Coordination framework
- `CRITICAL_FILES_PROTECTION.md` - Protected files
- `PHASE_1_IMPLEMENTATION_PLAN.md` - Detailed plan
- `SYSTEM_CAPABILITIES_AND_ROADMAP.md` - Big picture
- `AGENT_VALUE_PROPOSITION.md` - Why we're doing this

### Code Standards:
- Python: PEP 8, type hints, docstrings
- TypeScript: ESLint, Prettier, JSDoc comments
- Tests: >95% coverage required
- Git: Conventional commits

### Tech Stack:
- **Backend:** Python 3.12, FastAPI, FreqTrade, NumPy, Pandas
- **Frontend:** React 18, TypeScript, TanStack Query, Recharts
- **Database:** PostgreSQL with Supabase
- **Testing:** pytest, React Testing Library

---

## 🎯 Success Criteria

### You're Doing Great If:
- ✅ All your tests pass
- ✅ Code reviews are positive
- ✅ Activity log is up to date
- ✅ No conflicts with other agents
- ✅ User is happy with progress

### Red Flags:
- ❌ Tests failing
- ❌ Merge conflicts
- ❌ Breaking changes
- ❌ Missing documentation
- ❌ Working on wrong files

---

## 🚀 Let's Build!

**Remember:**
1. Safety first - check critical files
2. Communicate often - use activity log
3. Test everything - no untested code
4. Document everything - future you will thank you
5. Ask questions - better to ask than break things

**You've got this! Let's build something amazing! 🎉**

