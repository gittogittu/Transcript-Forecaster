/**
 * Hyperparameter Optimization Service
 * Implements multiple optimization algorithms for automatic model improvement
 */

import {
  HyperparameterOptimizationConfig,
  OptimizationResult,
  TrialResult,
  HyperparameterRange,
  OptimizationObjective,
  SearchSpace,
  EarlyStoppingConfig
} from './types'

export class HyperparameterOptimizer {
  private config: HyperparameterOptimizationConfig
  private activeOptimizations: Map<string, OptimizationSession> = new Map()
  private optimizationHistory: OptimizationResult[] = []

  constructor(config: HyperparameterOptimizationConfig) {
    this.config = config
  }

  /**
   * Start hyperparameter optimization for a model
   */
  async optimizeHyperparameters(
    modelId: string,
    modelType: string,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    if (!this.config.enabled) {
      throw new Error('Hyperparameter optimization is disabled')
    }

    // Check if optimization is already running for this model
    if (this.activeOptimizations.has(modelId)) {
      throw new Error(`Optimization already running for model ${modelId}`)
    }

    const session: OptimizationSession = {
      modelId,
      modelType,
      startTime: new Date(),
      status: 'running',
      currentIteration: 0,
      bestScore: -Infinity,
      bestParameters: {},
      trials: [],
      earlyStoppedAt: null
    }

    this.activeOptimizations.set(modelId, session)

    try {
      const result = await this.executeOptimization(session, trainingData, validationData)
      
      // Store result in history
      this.optimizationHistory.push(result)
      
      // Clean up active session
      this.activeOptimizations.delete(modelId)
      
      return result
    } catch (error) {
      session.status = 'failed'
      this.activeOptimizations.delete(modelId)
      throw error
    }
  }

  /**
   * Execute the optimization process
   */
  private async executeOptimization(
    session: OptimizationSession,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    const { algorithm, searchSpace, optimizationObjective } = this.config

    switch (algorithm) {
      case 'grid_search':
        return this.executeGridSearch(session, trainingData, validationData)
      case 'random_search':
        return this.executeRandomSearch(session, trainingData, validationData)
      case 'bayesian':
        return this.executeBayesianOptimization(session, trainingData, validationData)
      case 'genetic':
        return this.executeGeneticAlgorithm(session, trainingData, validationData)
      case 'hyperband':
        return this.executeHyperband(session, trainingData, validationData)
      default:
        throw new Error(`Unsupported optimization algorithm: ${algorithm}`)
    }
  }

  /**
   * Execute grid search optimization
   */
  private async executeGridSearch(
    session: OptimizationSession,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    const parameterCombinations = this.generateGridSearchCombinations()
    const maxIterations = Math.min(parameterCombinations.length, this.config.searchSpace.maxIterations)

    for (let i = 0; i < maxIterations; i++) {
      if (this.shouldStopEarly(session)) {
        session.earlyStoppedAt = i
        break
      }

      const parameters = parameterCombinations[i]
      const trial = await this.evaluateParameters(session, parameters, trainingData, validationData)
      
      session.trials.push(trial)
      session.currentIteration = i + 1

      if (this.isScoreBetter(trial.score, session.bestScore)) {
        session.bestScore = trial.score
        session.bestParameters = { ...parameters }
      }
    }

    return this.createOptimizationResult(session)
  }

  /**
   * Execute random search optimization
   */
  private async executeRandomSearch(
    session: OptimizationSession,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    const maxIterations = this.config.searchSpace.maxIterations

    for (let i = 0; i < maxIterations; i++) {
      if (this.shouldStopEarly(session)) {
        session.earlyStoppedAt = i
        break
      }

      const parameters = this.generateRandomParameters()
      const trial = await this.evaluateParameters(session, parameters, trainingData, validationData)
      
      session.trials.push(trial)
      session.currentIteration = i + 1

      if (this.isScoreBetter(trial.score, session.bestScore)) {
        session.bestScore = trial.score
        session.bestParameters = { ...parameters }
      }
    }

    return this.createOptimizationResult(session)
  }

  /**
   * Execute Bayesian optimization
   */
  private async executeBayesianOptimization(
    session: OptimizationSession,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    // Initialize with random samples
    const initialSamples = Math.min(5, Math.floor(this.config.searchSpace.maxIterations * 0.1))
    
    for (let i = 0; i < initialSamples; i++) {
      const parameters = this.generateRandomParameters()
      const trial = await this.evaluateParameters(session, parameters, trainingData, validationData)
      session.trials.push(trial)
      
      if (this.isScoreBetter(trial.score, session.bestScore)) {
        session.bestScore = trial.score
        session.bestParameters = { ...parameters }
      }
    }

    // Bayesian optimization iterations
    for (let i = initialSamples; i < this.config.searchSpace.maxIterations; i++) {
      if (this.shouldStopEarly(session)) {
        session.earlyStoppedAt = i
        break
      }

      // Use acquisition function to select next parameters
      const parameters = this.selectNextParametersBayesian(session.trials)
      const trial = await this.evaluateParameters(session, parameters, trainingData, validationData)
      
      session.trials.push(trial)
      session.currentIteration = i + 1

      if (this.isScoreBetter(trial.score, session.bestScore)) {
        session.bestScore = trial.score
        session.bestParameters = { ...parameters }
      }
    }

    return this.createOptimizationResult(session)
  }

  /**
   * Execute genetic algorithm optimization
   */
  private async executeGeneticAlgorithm(
    session: OptimizationSession,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    const populationSize = 20
    const generations = Math.floor(this.config.searchSpace.maxIterations / populationSize)
    
    // Initialize population
    let population = Array.from({ length: populationSize }, () => this.generateRandomParameters())
    
    for (let generation = 0; generation < generations; generation++) {
      // Evaluate population
      const populationScores: { parameters: Record<string, any>, score: number }[] = []
      
      for (const parameters of population) {
        if (this.shouldStopEarly(session)) {
          session.earlyStoppedAt = generation * populationSize + populationScores.length
          break
        }

        const trial = await this.evaluateParameters(session, parameters, trainingData, validationData)
        session.trials.push(trial)
        populationScores.push({ parameters, score: trial.score })

        if (this.isScoreBetter(trial.score, session.bestScore)) {
          session.bestScore = trial.score
          session.bestParameters = { ...parameters }
        }
      }

      if (this.shouldStopEarly(session)) break

      // Selection, crossover, and mutation
      population = this.evolvePopulation(populationScores)
      session.currentIteration = (generation + 1) * populationSize
    }

    return this.createOptimizationResult(session)
  }

  /**
   * Execute Hyperband optimization
   */
  private async executeHyperband(
    session: OptimizationSession,
    trainingData: any[],
    validationData: any[]
  ): Promise<OptimizationResult> {
    const maxResource = 100 // Maximum training epochs/iterations
    const eta = 3 // Reduction factor
    
    const sMax = Math.floor(Math.log(maxResource) / Math.log(eta))
    let totalIterations = 0

    for (let s = sMax; s >= 0; s--) {
      const n = Math.ceil((sMax + 1) / (s + 1) * Math.pow(eta, s))
      const r = maxResource / Math.pow(eta, s)
      
      // Generate random configurations
      let configurations = Array.from({ length: n }, () => this.generateRandomParameters())
      
      for (let i = 0; i <= s; i++) {
        const nI = Math.floor(n / Math.pow(eta, i))
        const rI = r * Math.pow(eta, i)
        
        // Evaluate configurations with resource rI
        const results: { parameters: Record<string, any>, score: number }[] = []
        
        for (const parameters of configurations.slice(0, nI)) {
          if (this.shouldStopEarly(session) || totalIterations >= this.config.searchSpace.maxIterations) {
            session.earlyStoppedAt = totalIterations
            break
          }

          const trial = await this.evaluateParametersWithResource(
            session, parameters, trainingData, validationData, rI
          )
          session.trials.push(trial)
          results.push({ parameters, score: trial.score })
          totalIterations++

          if (this.isScoreBetter(trial.score, session.bestScore)) {
            session.bestScore = trial.score
            session.bestParameters = { ...parameters }
          }
        }

        if (this.shouldStopEarly(session) || totalIterations >= this.config.searchSpace.maxIterations) break

        // Keep top configurations for next round
        results.sort((a, b) => this.isScoreBetter(b.score, a.score) ? 1 : -1)
        configurations = results.slice(0, Math.floor(nI / eta)).map(r => r.parameters)
      }

      if (this.shouldStopEarly(session) || totalIterations >= this.config.searchSpace.maxIterations) break
    }

    session.currentIteration = totalIterations
    return this.createOptimizationResult(session)
  }

  /**
   * Generate all parameter combinations for grid search
   */
  private generateGridSearchCombinations(): Record<string, any>[] {
    const parameters = this.config.searchSpace.parameters
    const combinations: Record<string, any>[] = []

    const generateCombinations = (paramIndex: number, currentCombination: Record<string, any>) => {
      if (paramIndex >= parameters.length) {
        combinations.push({ ...currentCombination })
        return
      }

      const param = parameters[paramIndex]
      const values = this.getParameterValues(param)

      for (const value of values) {
        currentCombination[param.name] = value
        generateCombinations(paramIndex + 1, currentCombination)
      }
    }

    generateCombinations(0, {})
    return combinations
  }

  /**
   * Generate random parameters
   */
  private generateRandomParameters(): Record<string, any> {
    const parameters: Record<string, any> = {}

    for (const param of this.config.searchSpace.parameters) {
      parameters[param.name] = this.generateRandomParameterValue(param)
    }

    return parameters
  }

  /**
   * Generate random value for a parameter
   */
  private generateRandomParameterValue(param: HyperparameterRange): any {
    switch (param.type) {
      case 'continuous':
        const [min, max] = param.range as [number, number]
        if (param.distribution === 'log_uniform') {
          const logMin = Math.log(min)
          const logMax = Math.log(max)
          return Math.exp(Math.random() * (logMax - logMin) + logMin)
        } else if (param.distribution === 'normal') {
          // Box-Muller transform for normal distribution
          const u1 = Math.random()
          const u2 = Math.random()
          const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
          const mean = (min + max) / 2
          const std = (max - min) / 6 // 99.7% within range
          return Math.max(min, Math.min(max, mean + z0 * std))
        } else {
          return Math.random() * (max - min) + min
        }
      
      case 'discrete':
        const values = param.range as number[]
        return values[Math.floor(Math.random() * values.length)]
      
      case 'categorical':
        const categories = param.range as string[]
        return categories[Math.floor(Math.random() * categories.length)]
      
      default:
        throw new Error(`Unsupported parameter type: ${param.type}`)
    }
  }

  /**
   * Get all possible values for a parameter (for grid search)
   */
  private getParameterValues(param: HyperparameterRange): any[] {
    switch (param.type) {
      case 'continuous':
        const [min, max] = param.range as [number, number]
        const steps = 5 // Default number of steps for continuous parameters
        const values: number[] = []
        for (let i = 0; i < steps; i++) {
          values.push(min + (max - min) * i / (steps - 1))
        }
        return values
      
      case 'discrete':
        return param.range as number[]
      
      case 'categorical':
        return param.range as string[]
      
      default:
        throw new Error(`Unsupported parameter type: ${param.type}`)
    }
  }

  /**
   * Evaluate parameters and return trial result
   */
  private async evaluateParameters(
    session: OptimizationSession,
    parameters: Record<string, any>,
    trainingData: any[],
    validationData: any[]
  ): Promise<TrialResult> {
    const startTime = Date.now()
    const trialId = `trial_${session.modelId}_${session.currentIteration}_${Date.now()}`

    try {
      // This would integrate with actual model training
      // For now, we'll simulate the evaluation
      const score = await this.simulateModelTraining(parameters, trainingData, validationData)
      
      const trainingTime = Date.now() - startTime

      return {
        trialId,
        parameters: { ...parameters },
        score,
        trainingTime,
        status: 'completed',
        metadata: {
          trainingDataSize: trainingData.length,
          validationDataSize: validationData.length
        }
      }
    } catch (error) {
      return {
        trialId,
        parameters: { ...parameters },
        score: this.config.optimizationObjective.direction === 'maximize' ? -Infinity : Infinity,
        trainingTime: Date.now() - startTime,
        status: 'failed',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Evaluate parameters with specific resource allocation (for Hyperband)
   */
  private async evaluateParametersWithResource(
    session: OptimizationSession,
    parameters: Record<string, any>,
    trainingData: any[],
    validationData: any[],
    resource: number
  ): Promise<TrialResult> {
    const startTime = Date.now()
    const trialId = `trial_${session.modelId}_${session.currentIteration}_${Date.now()}`

    try {
      // Simulate training with limited resources
      const score = await this.simulateModelTrainingWithResource(
        parameters, trainingData, validationData, resource
      )
      
      const trainingTime = Date.now() - startTime

      return {
        trialId,
        parameters: { ...parameters },
        score,
        trainingTime,
        status: 'completed',
        metadata: {
          resource,
          trainingDataSize: trainingData.length,
          validationDataSize: validationData.length
        }
      }
    } catch (error) {
      return {
        trialId,
        parameters: { ...parameters },
        score: this.config.optimizationObjective.direction === 'maximize' ? -Infinity : Infinity,
        trainingTime: Date.now() - startTime,
        status: 'failed',
        metadata: {
          resource,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Simulate model training (would be replaced with actual training)
   */
  private async simulateModelTraining(
    parameters: Record<string, any>,
    trainingData: any[],
    validationData: any[]
  ): Promise<number> {
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))

    // Simulate score based on parameters (this would be actual model evaluation)
    let score = 0.7 + Math.random() * 0.25 // Base score between 0.7 and 0.95

    // Adjust score based on parameters (simplified simulation)
    if (parameters.learning_rate) {
      const lr = parameters.learning_rate
      if (lr > 0.001 && lr < 0.1) {
        score += 0.05 // Good learning rate range
      } else {
        score -= 0.1 // Poor learning rate
      }
    }

    if (parameters.batch_size) {
      const bs = parameters.batch_size
      if (bs >= 16 && bs <= 128) {
        score += 0.03 // Good batch size range
      }
    }

    if (parameters.hidden_units) {
      const hu = parameters.hidden_units
      if (hu >= 64 && hu <= 512) {
        score += 0.02 // Good hidden units range
      }
    }

    // Add some noise
    score += (Math.random() - 0.5) * 0.1

    return Math.max(0, Math.min(1, score))
  }

  /**
   * Simulate model training with resource constraints
   */
  private async simulateModelTrainingWithResource(
    parameters: Record<string, any>,
    trainingData: any[],
    validationData: any[],
    resource: number
  ): Promise<number> {
    // Simulate training time proportional to resource
    await new Promise(resolve => setTimeout(resolve, resource * 10))

    // Get base score
    let score = await this.simulateModelTraining(parameters, trainingData, validationData)

    // Adjust score based on resource allocation
    const resourceFactor = Math.min(1, resource / 100) // Normalize to 0-1
    score = score * (0.5 + 0.5 * resourceFactor) // Lower resource = lower score

    return score
  }

  /**
   * Select next parameters using Bayesian optimization
   */
  private selectNextParametersBayesian(trials: TrialResult[]): Record<string, any> {
    // Simplified Bayesian optimization - in practice, this would use Gaussian Processes
    // For now, we'll use a simple acquisition function based on exploration vs exploitation
    
    if (trials.length === 0) {
      return this.generateRandomParameters()
    }

    // Find best trial
    const bestTrial = trials.reduce((best, trial) => 
      this.isScoreBetter(trial.score, best.score) ? trial : best
    )

    // Generate parameters around the best trial with some exploration
    const parameters: Record<string, any> = {}
    
    for (const param of this.config.searchSpace.parameters) {
      const bestValue = bestTrial.parameters[param.name]
      
      if (param.type === 'continuous') {
        const [min, max] = param.range as [number, number]
        const explorationRadius = (max - min) * 0.1 // 10% exploration radius
        const newValue = bestValue + (Math.random() - 0.5) * 2 * explorationRadius
        parameters[param.name] = Math.max(min, Math.min(max, newValue))
      } else {
        // For discrete/categorical, occasionally explore random values
        if (Math.random() < 0.2) { // 20% exploration
          parameters[param.name] = this.generateRandomParameterValue(param)
        } else {
          parameters[param.name] = bestValue
        }
      }
    }

    return parameters
  }

  /**
   * Evolve population for genetic algorithm
   */
  private evolvePopulation(
    populationScores: { parameters: Record<string, any>, score: number }[]
  ): Record<string, any>[] {
    // Sort by score
    populationScores.sort((a, b) => this.isScoreBetter(b.score, a.score) ? 1 : -1)
    
    const populationSize = populationScores.length
    const eliteSize = Math.floor(populationSize * 0.2) // Keep top 20%
    const newPopulation: Record<string, any>[] = []

    // Keep elite individuals
    for (let i = 0; i < eliteSize; i++) {
      newPopulation.push({ ...populationScores[i].parameters })
    }

    // Generate offspring through crossover and mutation
    while (newPopulation.length < populationSize) {
      // Tournament selection
      const parent1 = this.tournamentSelection(populationScores)
      const parent2 = this.tournamentSelection(populationScores)

      // Crossover
      const offspring = this.crossover(parent1.parameters, parent2.parameters)

      // Mutation
      const mutatedOffspring = this.mutate(offspring)

      newPopulation.push(mutatedOffspring)
    }

    return newPopulation
  }

  /**
   * Tournament selection for genetic algorithm
   */
  private tournamentSelection(
    populationScores: { parameters: Record<string, any>, score: number }[]
  ): { parameters: Record<string, any>, score: number } {
    const tournamentSize = 3
    let best = populationScores[Math.floor(Math.random() * populationScores.length)]

    for (let i = 1; i < tournamentSize; i++) {
      const candidate = populationScores[Math.floor(Math.random() * populationScores.length)]
      if (this.isScoreBetter(candidate.score, best.score)) {
        best = candidate
      }
    }

    return best
  }

  /**
   * Crossover operation for genetic algorithm
   */
  private crossover(
    parent1: Record<string, any>,
    parent2: Record<string, any>
  ): Record<string, any> {
    const offspring: Record<string, any> = {}

    for (const param of this.config.searchSpace.parameters) {
      const name = param.name
      
      if (Math.random() < 0.5) {
        offspring[name] = parent1[name]
      } else {
        offspring[name] = parent2[name]
      }
    }

    return offspring
  }

  /**
   * Mutation operation for genetic algorithm
   */
  private mutate(individual: Record<string, any>): Record<string, any> {
    const mutated = { ...individual }
    const mutationRate = 0.1

    for (const param of this.config.searchSpace.parameters) {
      if (Math.random() < mutationRate) {
        mutated[param.name] = this.generateRandomParameterValue(param)
      }
    }

    return mutated
  }

  /**
   * Check if early stopping should be triggered
   */
  private shouldStopEarly(session: OptimizationSession): boolean {
    if (!this.config.earlyStoppingConfig.enabled) {
      return false
    }

    const { patience, minDelta, metric, mode } = this.config.earlyStoppingConfig
    
    if (session.trials.length < patience) {
      return false
    }

    // Check if there's been improvement in the last 'patience' trials
    const recentTrials = session.trials.slice(-patience)
    const bestRecentScore = recentTrials.reduce((best, trial) => 
      this.isScoreBetter(trial.score, best) ? trial.score : best, 
      mode === 'max' ? -Infinity : Infinity
    )

    const improvementThreshold = mode === 'max' ? session.bestScore + minDelta : session.bestScore - minDelta
    
    return mode === 'max' ? bestRecentScore < improvementThreshold : bestRecentScore > improvementThreshold
  }

  /**
   * Check if one score is better than another
   */
  private isScoreBetter(score1: number, score2: number): boolean {
    return this.config.optimizationObjective.direction === 'maximize' ? score1 > score2 : score1 < score2
  }

  /**
   * Create optimization result from session
   */
  private createOptimizationResult(session: OptimizationSession): OptimizationResult {
    const completedTrials = session.trials.filter(t => t.status === 'completed')
    const baselineScore = completedTrials.length > 0 ? completedTrials[0].score : 0
    const improvementPercentage = baselineScore !== 0 
      ? ((session.bestScore - baselineScore) / Math.abs(baselineScore)) * 100
      : 0

    return {
      id: `optimization_${session.modelId}_${Date.now()}`,
      modelId: session.modelId,
      algorithm: this.config.algorithm,
      bestParameters: session.bestParameters,
      bestScore: session.bestScore,
      improvementPercentage,
      totalTrials: session.trials.length,
      optimizationTime: Date.now() - session.startTime.getTime(),
      convergenceReached: !session.earlyStoppedAt,
      searchHistory: [...session.trials]
    }
  }

  /**
   * Get optimization status
   */
  getOptimizationStatus(modelId: string): OptimizationSession | null {
    return this.activeOptimizations.get(modelId) || null
  }

  /**
   * Cancel optimization
   */
  cancelOptimization(modelId: string): boolean {
    const session = this.activeOptimizations.get(modelId)
    if (session && session.status === 'running') {
      session.status = 'cancelled'
      this.activeOptimizations.delete(modelId)
      return true
    }
    return false
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(modelId?: string): OptimizationResult[] {
    if (modelId) {
      return this.optimizationHistory.filter(result => result.modelId === modelId)
    }
    return [...this.optimizationHistory]
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HyperparameterOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get best parameters for a model from history
   */
  getBestParameters(modelId: string): Record<string, any> | null {
    const modelResults = this.optimizationHistory.filter(result => result.modelId === modelId)
    if (modelResults.length === 0) return null

    const bestResult = modelResults.reduce((best, result) => 
      this.isScoreBetter(result.bestScore, best.bestScore) ? result : best
    )

    return bestResult.bestParameters
  }
}

interface OptimizationSession {
  modelId: string
  modelType: string
  startTime: Date
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  currentIteration: number
  bestScore: number
  bestParameters: Record<string, any>
  trials: TrialResult[]
  earlyStoppedAt: number | null
}