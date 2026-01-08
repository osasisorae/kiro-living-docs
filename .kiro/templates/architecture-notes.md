# Architecture Notes Template

This template is used by the Auto-Doc-Sync System to generate consistent architectural documentation.

## Template Variables

- `{{component_name}}` - Name of the architectural component
- `{{component_type}}` - Type of component (service, module, library, etc.)
- `{{purpose}}` - Primary purpose and responsibility of the component
- `{{dependencies}}` - Array of component dependencies
- `{{interfaces}}` - Array of interface definitions
- `{{implementation_details}}` - Key implementation details
- `{{integration_points}}` - How the component integrates with others
- `{{error_handling}}` - Error handling approach
- `{{performance_considerations}}` - Performance-related notes
- `{{security_considerations}}` - Security-related notes
- `{{testing_strategy}}` - Testing approach for the component

## Template Content

```markdown
# {{component_name}} Architecture Notes

## Component Overview

**Type:** {{component_type}}  
**Purpose:** {{purpose}}

## Responsibilities

{{#each responsibilities}}
- {{description}}
{{/each}}

## Dependencies

{{#each dependencies}}
### {{name}}

**Type:** {{type}}  
**Purpose:** {{purpose}}  
**Integration:** {{integration_method}}

{{#if version_requirements}}
**Version Requirements:** {{version_requirements}}
{{/if}}

{{#if configuration}}
**Configuration:**
```{{config_format}}
{{configuration}}
```
{{/if}}

{{/each}}

## Interfaces

{{#each interfaces}}
### {{name}}

**Type:** {{type}}  
**Description:** {{description}}

```typescript
{{definition}}
```

{{#if usage_example}}
**Usage Example:**
```typescript
{{usage_example}}
```
{{/if}}

{{#if implementation_notes}}
**Implementation Notes:** {{implementation_notes}}
{{/if}}

---

{{/each}}

## Implementation Details

{{implementation_details}}

### Key Design Decisions

{{#each design_decisions}}
- **{{decision}}**: {{rationale}}
{{/each}}

### Data Flow

{{#if data_flow_diagram}}
```mermaid
{{data_flow_diagram}}
```
{{/if}}

{{data_flow_description}}

### State Management

{{#if state_management}}
{{state_management.approach}}

{{#if state_management.diagram}}
```mermaid
{{state_management.diagram}}
```
{{/if}}
{{/if}}

## Integration Points

{{#each integration_points}}
### {{name}}

**Type:** {{type}}  
**Direction:** {{direction}}  
**Protocol:** {{protocol}}  
**Description:** {{description}}

{{#if configuration}}
**Configuration:**
```{{config_format}}
{{configuration}}
```
{{/if}}

{{#if example}}
**Example:**
```{{example_language}}
{{example}}
```
{{/if}}

---

{{/each}}

## Error Handling

{{error_handling.approach}}

### Error Types

{{#each error_handling.error_types}}
- **{{type}}**: {{description}}
  - **Recovery Strategy:** {{recovery_strategy}}
  - **Logging Level:** {{logging_level}}
{{/each}}

### Error Propagation

{{error_handling.propagation_strategy}}

## Performance Considerations

{{#each performance_considerations}}
### {{aspect}}

**Concern:** {{concern}}  
**Mitigation:** {{mitigation}}

{{#if metrics}}
**Key Metrics:**
{{#each metrics}}
- {{name}}: {{target}} ({{measurement_method}})
{{/each}}
{{/if}}

{{/each}}

## Security Considerations

{{#each security_considerations}}
### {{aspect}}

**Risk:** {{risk}}  
**Mitigation:** {{mitigation}}  
**Implementation:** {{implementation}}

{{/each}}

## Testing Strategy

{{testing_strategy.overview}}

### Unit Testing

{{testing_strategy.unit_testing.approach}}

**Coverage Requirements:** {{testing_strategy.unit_testing.coverage_target}}

### Integration Testing

{{testing_strategy.integration_testing.approach}}

### Property-Based Testing

{{#if testing_strategy.property_based_testing}}
{{testing_strategy.property_based_testing.approach}}

**Properties Tested:**
{{#each testing_strategy.property_based_testing.properties}}
- {{name}}: {{description}}
{{/each}}
{{/if}}

## Monitoring and Observability

{{#if monitoring}}
### Metrics

{{#each monitoring.metrics}}
- **{{name}}**: {{description}} ({{type}})
{{/each}}

### Logging

{{monitoring.logging.approach}}

**Log Levels:**
{{#each monitoring.logging.levels}}
- {{level}}: {{usage}}
{{/each}}

### Health Checks

{{#each monitoring.health_checks}}
- **{{name}}**: {{description}} ({{endpoint}})
{{/each}}
{{/if}}

## Future Considerations

{{#each future_considerations}}
### {{area}}

**Current State:** {{current_state}}  
**Planned Improvements:** {{planned_improvements}}  
**Timeline:** {{timeline}}

{{/each}}

## Related Documentation

{{#each related_docs}}
- [{{title}}]({{url}}): {{description}}
{{/each}}
```

## Usage Instructions

This template is automatically processed by the Auto-Doc-Sync System when:

1. New architectural components are added
2. Existing components undergo significant structural changes
3. Integration patterns are modified
4. Performance or security characteristics change

## Customization

To customize this template:

1. Add project-specific architectural concerns
2. Include additional sections for domain-specific requirements
3. Modify the interface documentation format as needed
4. Add custom diagrams or visualization requirements

## Best Practices

- Keep architectural documentation current with implementation
- Include both high-level design and implementation details
- Document design decisions and their rationale
- Provide clear integration examples
- Update performance and security considerations regularly
- Link to related specifications and requirements